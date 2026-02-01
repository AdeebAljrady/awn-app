import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getQuizQuestions } from "@/app/actions/db/quizzes";
import QuizPlay from "@/components/awn/QuizPlay";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function QuizPlayPage({ params }: Props) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    const { id } = await params;

    // Fetch quiz info
    const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (!quizData) {
        notFound();
    }

    // Fetch questions
    const { data: questions, error } = await getQuizQuestions(id);

    if (error || !questions || questions.length === 0) {
        notFound();
    }

    return (
        <QuizPlay
            quizId={id}
            fileName={quizData.file_name}
            unit={quizData.unit}
            questions={questions}
        />
    );
}
