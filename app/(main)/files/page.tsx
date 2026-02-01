import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import Link from "next/link";
import FilesList from "@/components/awn/FilesList";

export default async function FilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Fetch user's uploaded files from database
  const { data: files } = await supabase
    .from("uploaded_files")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-beige-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-gold-500" />
          ملفاتي
        </h1>
        <Link
          href="/"
          className="bg-gold-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-gold-600 transition-colors"
        >
          رفع ملف جديد
        </Link>
      </div>

      {!files || files.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200 border-dashed">
          <FileText className="w-16 h-16 text-beige-300 mx-auto mb-4" />
          <p className="text-beige-600 text-lg mb-2">لا توجد ملفات محفوظة بعد.</p>
          <p className="text-beige-400 text-sm">
            ارفع ملف PDF من الصفحة الرئيسية للبدء
          </p>
        </div>
      ) : (
        <FilesList files={files} />
      )}
    </div>
  );
}
