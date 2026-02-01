"use server";

import { createClient } from "@/lib/supabase/server";
import { QuizQuestion } from "@/lib/types/awn";

export interface Quiz {
  id: string;
  user_id: string;
  file_id: string | null;
  file_name: string;
  unit: string | null;
  created_at: string;
}

export interface QuizQuestionDB {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  justification: string | null;
  example: string | null;
  order_index: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

/**
 * Create a new quiz with its questions
 */
export async function createQuiz(
  fileName: string,
  unit: string,
  questions: QuizQuestion[],
  fileId?: string
): Promise<{ data: Quiz | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "المستخدم غير مسجل الدخول" };
    }

    // Create the quiz first
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        user_id: user.id,
        file_id: fileId || null,
        file_name: fileName,
        unit: unit || null,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error("Create quiz error:", quizError);
      return { data: null, error: quizError?.message || "فشل في إنشاء الاختبار" };
    }

    // Insert questions
    const questionsToInsert = questions.map((q, index) => ({
      quiz_id: quiz.id,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      justification: q.justification || null,
      example: q.example || null,
      order_index: index,
    }));

    const { error: questionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Create questions error:", questionsError);
      // Delete the quiz if questions failed to insert
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return { data: null, error: questionsError.message };
    }

    return { data: quiz, error: null };
  } catch (error) {
    console.error("Create quiz error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الاختبار",
    };
  }
}

/**
 * Get all quizzes for the current user
 */
export async function getUserQuizzes(): Promise<{
  data: Quiz[];
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
      .from("quizzes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get quizzes error:", error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get quizzes error:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "حدث خطأ أثناء جلب الاختبارات",
    };
  }
}

/**
 * Get quiz questions by quiz ID
 */
export async function getQuizQuestions(
  quizId: string
): Promise<{ data: QuizQuestion[]; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Get questions error:", error);
      return { data: [], error: error.message };
    }

    // Convert DB format to app format
    const questions: QuizQuestion[] = (data || []).map((q: QuizQuestionDB) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      justification: q.justification || "",
      example: q.example || "",
    }));

    return { data: questions, error: null };
  } catch (error) {
    console.error("Get questions error:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "حدث خطأ أثناء جلب الأسئلة",
    };
  }
}

/**
 * Save a quiz attempt (score)
 */
export async function saveQuizAttempt(
  quizId: string,
  score: number,
  totalQuestions: number
): Promise<{ data: QuizAttempt | null; error: string | null }> {
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
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score: score,
        total_questions: totalQuestions,
      })
      .select()
      .single();

    if (error) {
      console.error("Save attempt error:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Save attempt error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ النتيجة",
    };
  }
}

/**
 * Delete a quiz and its questions
 */
export async function deleteQuiz(
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

    // Questions will be cascade deleted due to FK constraint
    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete quiz error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Delete quiz error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الاختبار",
    };
  }
}
