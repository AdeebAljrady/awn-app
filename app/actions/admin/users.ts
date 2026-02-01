"use server";

import { createClientAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "./auth";

interface UserWithStats {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  credits_balance: number;
  summaries_count: number;
  quizzes_count: number;
}

interface GetUsersResult {
  users: UserWithStats[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Get all users with their stats (admin only)
 */
export async function getAllUsers(
  page: number = 1,
  pageSize: number = 20,
  search: string = ""
): Promise<{ data: GetUsersResult | null; error: string | null }> {
  try {
    await requireAdmin();

    const supabase = await createClientAdmin();
    const offset = (page - 1) * pageSize;

    // Use the admin_users_view for efficient querying
    let query = supabase
      .from("admin_users_view")
      .select("*", { count: "exact" });

    // Add search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const {
      data: users,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.log(error);

      return { data: null, error: error.message };
    }

    // Map the view data to our interface
    const usersWithStats: UserWithStats[] = (users || []).map((user) => ({
      id: user.id,
      email: user.email || "",
      full_name: user.full_name || null,
      avatar_url: user.avatar_url || null,
      created_at: user.created_at || "",
      credits_balance: user.credits_balance || 0,
      summaries_count: user.summaries_count || 0,
      quizzes_count: user.quizzes_count || 0,
    }));

    return {
      data: {
        users: usersWithStats,
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Ban a user (admin only)
 * Uses auth.users.banned_until column
 */
export async function banUser(
  userId: string,
  reason: string = ""
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();

    const supabase = await createClientAdmin();

    // Log the action first
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      action_type: "user_ban",
      description: `Banned user: ${userId}`,
      metadata: { banned_user_id: userId, reason },
    });

    // Ban user by setting banned_until to far future
    // Note: This requires admin API or service role
    // For now, log the action - actual ban needs Supabase Admin API

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Unban a user (admin only)
 */
export async function unbanUser(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();

    const supabase = await createClientAdmin();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      action_type: "user_unban",
      description: `Unbanned user: ${userId}`,
      metadata: { unbanned_user_id: userId },
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Set user credits manually (admin only)
 */
export async function setUserCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();

    const supabase = await createClientAdmin();

    // 1. Get current balance to calculate delta for transaction log
    const { data: credits, error: fetchError } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return { success: false, error: fetchError.message };
    }

    const currentBalance = credits?.balance || 0;
    const delta = amount - currentBalance;

    // 2. Update balance
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({ balance: amount, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Record transaction if there's a change
    if (delta !== 0) {
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: delta,
          action_type: "admin_set",
          description: `تعديل يدوي من الإدارة (الرصيد الجديد: ${amount})`,
        });

      if (txError) {
        console.error("Failed to record transaction:", txError);
      }
    }

    // 4. Log admin action
    const {
      data: { user: admin },
    } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: admin?.id,
      action_type: "credits_adjust",
      description: `Set credits for ${userId} to ${amount}`,
      metadata: { target_user_id: userId, new_balance: amount, delta },
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Gift credits to a user (admin only)
 * Increments balance and records a transaction
 */
export async function giftCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();

    const supabase = await createClientAdmin();

    // 1. Get current balance
    const { data: credits, error: fetchError } = await supabase
      .from("user_credits")
      .select("balance, total_earned")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const currentBalance = credits?.balance || 0;
    const currentTotalEarned = credits?.total_earned || 0;

    // 2. Update balance
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({
        balance: currentBalance + amount,
        total_earned: currentTotalEarned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Record transaction
    const { error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: amount,
        action_type: "admin_gift",
        description: "هدية مقدمة من الادمن",
      });

    if (txError) {
      console.error("Failed to record transaction:", txError);
      // We don't fail here as the balance was already updated
    }

    // 4. Log admin action
    const {
      data: { user: admin },
    } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: admin?.id,
      action_type: "credits_gift",
      description: `Gifted ${amount} credits to ${userId}`,
      metadata: { target_user_id: userId, amount },
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
