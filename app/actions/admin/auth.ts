"use server";

import { createClientAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user is an admin
 * Uses is_super_admin from app_metadata
 */
export async function isAdmin(): Promise<boolean> {
  try {
    
const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return false;
    }
    const supabaseAdmin = await createClientAdmin();
    const {data} = await supabaseAdmin.from("admins").select("*").eq("id", user.id).single();
      
    const isSuperAdmin = data? true : false;
    
    return isSuperAdmin;
  } catch {
    return false;
  }
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("غير مصرح لك بالوصول");
  }
}

