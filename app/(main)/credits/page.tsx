import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreditsPageClient from "./CreditsPageClient";

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return <CreditsPageClient />;
}
