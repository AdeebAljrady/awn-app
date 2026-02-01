"use server";

import { createClient } from "@/lib/supabase/server";

export interface Summary {
  id: string;
  user_id: string;
  file_id: string | null;
  file_name: string;
  unit: string | null;
  content: string;
  drawing_data: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new summary in the database
 */
export async function createSummary(
  fileName: string,
  unit: string,
  content: string,
  drawingData?: string,
  fileId?: string
): Promise<{ data: Summary | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "المستخدم غير مسجل الدخول" };
    }

    const { data, error } = await supabase
      .from("summaries")
      .insert({
        user_id: user.id,
        file_id: fileId || null,
        file_name: fileName,
        unit: unit || null,
        content: content,
        drawing_data: drawingData || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create summary error:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Create summary error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ التلخيص",
    };
  }
}

/**
 * Get all summaries for the current user
 */
export async function getUserSummaries(): Promise<{
  data: Summary[];
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
      .from("summaries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get summaries error:", error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get summaries error:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "حدث خطأ أثناء جلب التلخيصات",
    };
  }
}

/**
 * Get a single summary by ID
 */
export async function getSummaryById(
  id: string
): Promise<{ data: Summary | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "المستخدم غير مسجل الدخول" };
    }

    const { data, error } = await supabase
      .from("summaries")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Get summary error:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Get summary error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء جلب التلخيص",
    };
  }
}

/**
 * Update an existing summary
 */
export async function updateSummary(
  id: string,
  content?: string,
  drawingData?: string
): Promise<{ data: Summary | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "المستخدم غير مسجل الدخول" };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updateData.content = content;
    if (drawingData !== undefined) updateData.drawing_data = drawingData;

    const { data, error } = await supabase
      .from("summaries")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Update summary error:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Update summary error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث التلخيص",
    };
  }
}

/**
 * Delete a summary
 */
export async function deleteSummary(
  id: string
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

    const { error } = await supabase
      .from("summaries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete summary error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Delete summary error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حذف التلخيص",
    };
  }
}
