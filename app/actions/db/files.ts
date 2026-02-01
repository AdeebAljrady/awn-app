"use server";

import { createClient } from "@/lib/supabase/server";

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number | null;
  mime_type: string;
  created_at: string;
}

/**
 * Create a new uploaded file record in the database
 */
export async function createUploadedFile(
  fileName: string,
  filePath: string,
  _fileUrl: string, // Ignored
  fileSize?: number,
  mime_type?: string
): Promise<{ data: UploadedFile | null; error: string | null }> {
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
      .from("uploaded_files")
      .insert({
        user_id: user.id,
        file_name: fileName.slice(0, 255),
        // filePath from TUS includes "userId/filename". We store relative "filename".
        // getFileById adds "userId/" back when generating signed URL.
        file_path: filePath.replace(`${user.id}/`, ""), 
        file_url: "", // Empty on creation, generated on demand
        file_size: fileSize || null,
        mime_type: mime_type || "application/octet-stream",
      })
      .select()
      .single();

    if (error) {
      console.error("Create file error:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Create file error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الملف",
    };
  }
}

/**
 * Get all uploaded files for the current user
 */
export async function getUserFiles(): Promise<{
  data: UploadedFile[];
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
      .from("uploaded_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get files error:", error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get files error:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "حدث خطأ أثناء جلب الملفات",
    };
  }
}

/**
 * Get a single file by ID (for the current user)
 */
export async function getFileById(
  id: string
): Promise<{ data: UploadedFile | null; error: string | null }> {
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
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Get file error:", error);
      return { data: null, error: error.message };
    }

    // path in DB is relative (just filename or timestamp-filename)
    // We construct the full path: userId/filename
    const filePath = `${user.id}/${data.file_path}`;
    
    // console.log(`getFileById Debug: ID=${id}`);
    // console.log(`getFileById Debug: DB path="${data.file_path}"`);
    // console.log(`getFileById Debug: Constructing signed URL for "${filePath}"`);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("awn")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      
      // FALLBACK DEBUGGING: Check if file exists in root instead of folder?
      // Or listing the folder to see what's there.
      const { data: listData } = await supabase.storage.from("awn").list(user.id);
      // console.log(`getFileById Debug: Files in ${user.id}/:`, listData?.map(f => f.name));

      // Return data with clean URL (empty) so UI handles it gracefully (or shows error)
      return { data: { ...data, file_url: "" }, error: null };
    }

    // Return data with fresh signed URL
    return { 
      data: { ...data, file_url: signedUrlData.signedUrl }, 
      error: null 
    };
  } catch (error) {
    console.error("Get file error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء جلب الملف",
    };
  }
}

/**
 * Delete an uploaded file record
 */
export async function deleteUploadedFile(
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
      .from("uploaded_files")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete file error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Delete file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الملف",
    };
  }
}
