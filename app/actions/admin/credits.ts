"use server";

import { createClientAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "./auth";

interface CreditSetting {
  action_key: string;
  credit_cost: number;
  description: string;
}

interface Coupon {
  id: string;
  code: string;
  credit_amount: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

/**
 * Get all credit settings
 */
export async function getCreditSettings(): Promise<{
  data: CreditSetting[] | null;
  error: string | null;
}> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    
    const { data, error } = await supabase
      .from("credit_settings")
      .select("*")
      .order("action_key");
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Update a credit setting
 */
export async function updateCreditSetting(
  actionKey: string,
  newCost: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    
    const { error } = await supabase
      .from("credit_settings")
      .update({ credit_cost: newCost, updated_at: new Date().toISOString() })
      .eq("action_key", actionKey);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log action
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      action_type: "setting_update",
      description: `Updated ${actionKey} cost to ${newCost}`,
      metadata: { action_key: actionKey, new_cost: newCost },
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
 * Get all coupons (admin)
 */
export async function getAllCoupons(): Promise<{
  data: Coupon[] | null;
  error: string | null;
}> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    
    const { data, error } = await supabase
      .from("credit_coupons")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Create a new coupon
 */
export async function createCouponAdmin(
  code: string,
  creditAmount: number,
  maxUses: number = 1,
  expiresAt: string | null = null
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("credit_coupons").insert({
      code: code.toUpperCase(),
      credit_amount: creditAmount,
      max_uses: maxUses,
      current_uses: 0,
      is_active: true,
      expires_at: expiresAt,
      created_by: user?.id,
    });
    
    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "الكود موجود مسبقاً" };
      }
      return { success: false, error: error.message };
    }
    
    // Log action
    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      action_type: "coupon_create",
      description: `Created coupon ${code} with ${creditAmount} credits`,
      metadata: { code, credit_amount: creditAmount, max_uses: maxUses },
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
 * Toggle coupon active status
 */
export async function toggleCouponStatus(
  couponId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    
    const { error } = await supabase
      .from("credit_coupons")
      .update({ is_active: isActive })
      .eq("id", couponId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Generate a random 12-character alphanumeric code
 */
function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create multiple random coupons at once
 */
export async function createBulkCouponsAdmin(
  count: number,
  creditAmount: number,
  maxUses: number = 1
): Promise<{ success: boolean; codes: string[]; error: string | null }> {
  try {
    await requireAdmin();
    
    if (count < 1 || count > 1000) {
      return { success: false, codes: [], error: "العدد يجب أن يكون بين 1 و 1000" };
    }
    
    if (creditAmount < 1) {
      return { success: false, codes: [], error: "قيمة الرصيد يجب أن تكون أكبر من 0" };
    }
    
    const supabase = await createClientAdmin();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generate unique codes
    const codes: string[] = [];
    const couponsToInsert = [];
    
    for (let i = 0; i < count; i++) {
      let code = generateRandomCode();
      // Ensure uniqueness within this batch
      while (codes.includes(code)) {
        code = generateRandomCode();
      }
      codes.push(code);
      couponsToInsert.push({
        code,
        credit_amount: creditAmount,
        max_uses: maxUses,
        current_uses: 0,
        is_active: true,
        expires_at: null,
        created_by: user?.id,
      });
    }
    
    // Insert all coupons
    const { error } = await supabase.from("credit_coupons").insert(couponsToInsert);
    
    if (error) {
      if (error.code === "23505") {
        return { success: false, codes: [], error: "بعض الأكواد موجودة مسبقاً، حاول مرة أخرى" };
      }
      return { success: false, codes: [], error: error.message };
    }
    
    // Log action
    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      action_type: "bulk_coupon_create",
      description: `Created ${count} coupons with ${creditAmount} credits each`,
      metadata: { count, credit_amount: creditAmount, max_uses: maxUses },
    });
    
    return { success: true, codes, error: null };
  } catch (error) {
    return {
      success: false,
      codes: [],
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

