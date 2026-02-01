import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Brain, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatHijriDate } from "@/lib/utils/date";
import { getUserQuizzes } from "@/app/actions/db/quizzes";
import QuizList from "@/components/awn/QuizList";

export default async function QuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Fetch user's quizzes from database
  const { data: quizzes, error } = await getUserQuizzes();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-beige-900 flex items-center gap-3">
          <Brain className="w-8 h-8 text-gold-500" />
          كويزاتي
        </h1>
        <Link
          href="/"
          className="bg-gold-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-gold-600 transition-colors"
        >
          كويز جديد
        </Link>
      </div>

      {!quizzes || quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200 border-dashed">
          <Brain className="w-16 h-16 text-beige-300 mx-auto mb-4" />
          <p className="text-beige-600 text-lg mb-2">لا توجد كويزات بعد.</p>
          <p className="text-beige-400 text-sm">
            ارفع ملف PDF من الصفحة الرئيسية لإنشاء كويز ذكي
          </p>
        </div>
      ) : (
        <QuizList quizzes={quizzes} />
      )}
    </div>
  );
}
