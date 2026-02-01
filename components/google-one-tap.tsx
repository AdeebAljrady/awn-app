"use client";

import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Type declarations for Google One Tap
interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string | undefined;
      callback: (response: CredentialResponse) => void;
      nonce: string;
      use_fedcm_for_prompt?: boolean;
    }) => void;
    prompt: () => void;
    cancel: () => void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

// Generate nonce for secure token validation
const generateNonce = async (): Promise<[string, string]> => {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  );
  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [nonce, hashedNonce];
};

export default function GoogleOneTap() {
  const supabase = createClient();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeGoogleOneTap = async () => {
    if (isInitialized) return;
    
    console.log("Initializing Google One Tap");
    const [nonce, hashedNonce] = await generateNonce();

    // Check if there's already an existing session
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session", error);
    }
    if (data.session) {
      return; // User already logged in
    }

    // Initialize Google One Tap
    if (window.google?.accounts) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response: CredentialResponse) => {
          try {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce,
            });

            if (error) throw error;
            console.log("Successfully logged in with Google One Tap");
            router.push("/");
            router.refresh();
          } catch (error) {
            console.error("Error logging in with Google One Tap", error);
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.prompt();
      setIsInitialized(true);
    }
  };

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      onReady={() => {
        initializeGoogleOneTap();
      }}
      strategy="afterInteractive"
    />
  );
}
