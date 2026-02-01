"use server";

import { createClient } from "@/lib/supabase/server";
import { createClientAdmin } from "@/lib/supabase/admin";

export interface CreditCoupon {
  id: string;
  code: string;
  credit_amount: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CouponAttempt {
  id: string;
  user_id: string;
  attempted_code: string;
  success: boolean;
  ip_address: string | null;
  created_at: string;
}

// Delay to slow down brute force
const RESPONSE_DELAY_MS = 1500;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Redeem a coupon code
 * 
 * All validation, rate limiting, logging, and credit operations
 * are handled atomically in the SQL function redeem_coupon_full()
 */
export async function redeemCoupon(
  code: string
): Promise<{ success: boolean; credits: number; newBalance: number; error: string | null }> {
  try {
    // Add delay to slow down brute force (extra layer on top of SQL rate limiting)
    await delay(RESPONSE_DELAY_MS);

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, credits: 0, newBalance: 0, error: "المستخدم غير مسجل الدخول" };
    }

    // Call the atomic database function
    // This handles: rate limiting, validation, redemption, credits, logging - ALL IN ONE TRANSACTION
    const supabaseAdmin = await createClientAdmin();
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "redeem_coupon_full",
      { p_user_id: user.id, p_code: code }
    );

    if (rpcError) {
      console.error("Coupon RPC error:", rpcError);
      return { success: false, credits: 0, newBalance: 0, error: "حدث خطأ أثناء استخدام الكوبون" };
    }

    // Parse the JSON result from the function
    const { success, error, credits, newBalance } = result as {
      success: boolean;
      error: string | null;
      credits: number;
      newBalance: number;
    };

    return {
      success,
      credits: credits || 0,
      newBalance: newBalance || 0,
      error: error || null,
    };
  } catch (error) {
    console.error("Redeem coupon error:", error);
    return {
      success: false,
      credits: 0,
      newBalance: 0,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء استخدام الكوبون",
    };
  }
}
