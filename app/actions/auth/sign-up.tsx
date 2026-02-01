"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm-password") as string;

  if (password !== confirmPassword) {
    return { error: "كلمات المرور غير متطابقة" };
  }

  if (password.length < 8) {
    return { error: "يجب أن تكون كلمة المرور 8 أحرف على الأقل" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/sign-in?success=true&note=EmailNotConfirmed");
}
