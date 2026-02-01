"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClientAdmin } from "@/lib/supabase/admin";

/**
 * Update the user's profile name (redirects to home - for welcome page)
 */
export async function updateProfileName(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const fullName = formData.get("full_name") as string;

  if (!fullName || fullName.trim().length < 2) {
    return { error: "يرجى إدخال اسم صحيح (حرفان على الأقل)" };
  }

  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "يرجى تسجيل الدخول أولاً" };
  }

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!existingProfile) {
    // Initialize new user (create profile, credits, etc.)
    const { error: initError } = await supabase
      .rpc('initialize_new_user', { p_full_name: fullName.trim() });

    if (initError) {
      console.error("Initialization error:", initError);
      return { error: "حدث خطأ أثناء تهيئة الحساب" };
    }
  } else {
    // Normal update for existing profile
    const { error } = await supabase
      .from("profiles")
      .update({ 
        full_name: fullName.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      return { error: "حدث خطأ أثناء حفظ الاسم" };
    }
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * Update the user's profile (no redirect - for profile settings page)
 */
export async function updateProfile(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const fullName = formData.get("full_name") as string;

  if (!fullName || fullName.trim().length < 2) {
    return { error: "يرجى إدخال اسم صحيح (حرفان على الأقل)" };
  }

  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "يرجى تسجيل الدخول أولاً" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ 
      full_name: fullName.trim(),
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update error:", error);
    return { error: "حدث خطأ أثناء حفظ الاسم" };
  }

  revalidatePath("/profile");
  return { success: true };
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Get profile with credits for profile page
 */
export async function getProfileWithCredits() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { profile: null, credits: null, user: null };
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get credits
  const { data: credits } = await supabase
    .from("user_credits")
    .select("balance, total_earned, total_spent")
    .eq("user_id", user.id)
    .single();

  return { profile, credits, user };
}

/**
 * Get initial credits amount from settings
 */
export async function getInitialCredits(): Promise<number> {
  const supabase = await createClientAdmin();
  
  const { data,error } = await supabase
    .from("credit_settings")
    .select("credit_cost")
    .eq("action_key", "initial_credits")
    .single();

  return data?.credit_cost || 50;
}
