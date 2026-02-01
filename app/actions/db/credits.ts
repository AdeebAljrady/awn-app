"use server";

import { createClient } from "@/lib/supabase/server";
import { createClientAdmin } from "@/lib/supabase/admin";

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface CreditSetting {
  id: string;
  action_key: string;
  credit_cost: number;
  description: string | null;
  updated_at: string;
}

/**
 * Get or create user credits record
 */
export async function getUserCredits(): Promise<{
  data: UserCredits | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "المستخدم غير مسجل الدخول" };
    }

    // Try to get existing credits
    let { data, error } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no record exists, just return null (do NOT create automatically)
    if (error && error.code === "PGRST116") {
      return { data: null, error: null };
    }

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Get credits error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Get credit cost for a specific action from settings
 */
export async function getCreditCost(
  actionKey: string
): Promise<{ cost: number; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credit_settings")
      .select("credit_cost")
      .eq("action_key", actionKey)
      .single();

    if (error) {
      // Return default cost if setting not found
      return { cost: 10, error: null };
    }

    return { cost: data.credit_cost, error: null };
  } catch (error) {
    console.error("Get credit cost error:", error);
    return { cost: 10, error: null }; // Default to 10
  }
}

/**
 * Check if user has enough credits for an action
 */
export async function hasEnoughCredits(
  actionKey: string
): Promise<{ hasCredits: boolean; balance: number; cost: number; error: string | null }> {
  try {
    const { data: credits, error: creditsError } = await getUserCredits();
    if (creditsError || !credits) {
      return { hasCredits: false, balance: 0, cost: 0, error: creditsError };
    }

    const { cost } = await getCreditCost(actionKey);
    const hasCredits = credits.balance >= cost;

    return { hasCredits, balance: credits.balance, cost, error: null };
  } catch (error) {
    console.error("Check credits error:", error);
    return {
      hasCredits: false,
      balance: 0,
      cost: 0,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Deduct credits for an action
 */
export async function deductCredits(
  actionKey: string,
  referenceId?: string
): Promise<{ transaction: CreditTransaction | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { transaction: null, error: "المستخدم غير مسجل الدخول" };
    }

    // Get cost and check balance
    const { hasCredits, balance, cost, error: checkError } = await hasEnoughCredits(actionKey);
    if (checkError) {
      return { transaction: null, error: checkError };
    }

    if (!hasCredits) {
      return {
        transaction: null,
        error: `رصيدك غير كافٍ. الرصيد الحالي: ${balance}، التكلفة: ${cost}`,
      };
    }

    // Deduct from balance using admin client (bypasses RLS)
    const supabaseAdmin = await createClientAdmin();
    const { error: updateError } = await supabaseAdmin
      .from("user_credits")
      .update({
        balance: balance - cost,
        total_spent: (await getUserCredits()).data?.total_spent ?? 0 + cost,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return { transaction: null, error: updateError.message };
    }

    // Record transaction
    const { data: transaction, error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        amount: -cost,
        action_type: actionKey,
        description: `استخدام ${cost} رصيد لـ ${actionKey === "summary" ? "التلخيص" : "الكويز"}`,
        reference_id: referenceId || null,
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction log error:", txError);
      // Don't fail the whole operation for logging error
    }

    return { transaction, error: null };
  } catch (error) {
    console.error("Deduct credits error:", error);
    return {
      transaction: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء خصم الرصيد",
    };
  }
}

/**
 * Refund credits for a failed transaction
 */
export async function refundCredits(
  transactionId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "المستخدم غير مسجل الدخول" };
    }

    // Get the original transaction
    const { data: originalTx, error: txError } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", user.id)
      .single();

    if (txError || !originalTx) {
      return { success: false, error: "لم يتم العثور على المعاملة" };
    }

    // Only refund if it was a deduction (negative amount)
    if (originalTx.amount >= 0) {
      return { success: false, error: "لا يمكن استرداد هذه المعاملة" };
    }

    const refundAmount = Math.abs(originalTx.amount);

    // Get current balance
    const { data: credits, error: creditsError } = await getUserCredits();
    if (creditsError || !credits) {
      return { success: false, error: creditsError };
    }

    // Add refund to balance using admin client (bypasses RLS)
    const supabaseAdmin = await createClientAdmin();
    const { error: updateError } = await supabaseAdmin
      .from("user_credits")
      .update({
        balance: credits.balance + refundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Record refund transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: refundAmount,
      action_type: "refund",
      description: `استرداد ${refundAmount} رصيد - فشل العملية`,
      reference_id: transactionId,
    });

    return { success: true, error: null };
  } catch (error) {
    console.error("Refund credits error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء الاسترداد",
    };
  }
}

/**
 * Add credits to user (used by coupon redemption)
 */
export async function addCredits(
  amount: number,
  actionType: string,
  description: string,
  referenceId?: string
): Promise<{ success: boolean; newBalance: number; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, newBalance: 0, error: "المستخدم غير مسجل الدخول" };
    }

    // Get or create credits record
    const { data: credits, error: creditsError } = await getUserCredits();
    if (creditsError || !credits) {
      return { success: false, newBalance: 0, error: creditsError };
    }

    const newBalance = credits.balance + amount;

    // Update balance using admin client (bypasses RLS)
    const supabaseAdmin = await createClientAdmin();
    const { error: updateError } = await supabaseAdmin
      .from("user_credits")
      .update({
        balance: newBalance,
        total_earned: credits.total_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, newBalance: 0, error: updateError.message };
    }

    // Record transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: amount,
      action_type: actionType,
      description: description,
      reference_id: referenceId || null,
    });

    return { success: true, newBalance, error: null };
  } catch (error) {
    console.error("Add credits error:", error);
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الرصيد",
    };
  }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditTransactions(): Promise<{
  data: CreditTransaction[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [], error: "المستخدم غير مسجل الدخول" };
    }

    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get transactions error:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
