"use server";

import { createClient } from "@/lib/supabase/server";

type ActionType = 
  | "login"
  | "logout"
  | "summary_create"
  | "quiz_create"
  | "coupon_redeem"
  | "file_upload"
  | "credits_add"
  | "credits_deduct";

/**
 * Log an activity for the current user
 */
export async function logActivity(
  actionType: ActionType,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type: actionType,
      description,
      metadata: metadata || {},
    });
  } catch (error) {
    // Silently fail - logging shouldn't break the main flow
    console.error("Failed to log activity:", error);
  }
}
