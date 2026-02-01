"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function SigninToastHandler() {
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const note = searchParams.get("note");

    if (
      success === "true" &&
      note === "EmailNotConfirmed" &&
      !hasShownToast.current
    ) {
      hasShownToast.current = true;

      toast("تم إنشاء الحساب بنجاح", {
        description: "يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك",
      });

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("note");
      window.history.replaceState({}, "", url);
    }
  }, [searchParams]);

  return null;
}
