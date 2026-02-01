"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuizAttempt } from "@/app/actions/db/quizzes";
import {
    ArrowRight,
    Brain,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizQuestion } from "@/lib/types/awn";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface Props {
    quizId: string;
    fileName: string;
    unit: string | null;
    questions: QuizQuestion[];
}

export default function QuizPlay({ quizId, fileName, unit, questions }: Props) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showJustification, setShowJustification] = useState(false);
    const [score, setScore] = useState(0);
    const [step, setStep] = useState<"QUIZ" | "RESULT">("QUIZ");
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);

    const handleSelectAnswer = (index: number) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(index);
        setShowJustification(true);
        if (index === questions[currentIndex].correctAnswer) {
            setScore((prev) => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setSelectedAnswer(null);
            setShowJustification(false);
        } else {
            handleFinishQuiz();
        }
    };

    const handleFinishQuiz = async () => {
        setStep("RESULT");
        await saveQuizAttempt(quizId, score, questions.length);
    };

    const handleBackClick = () => {
        if (step === "QUIZ") {
            setShowLeaveDialog(true);
        } else {
            router.push("/quiz");
        }
    };

    const confirmLeave = () => {
        setShowLeaveDialog(false);
        router.push("/quiz");
    };

    const resetQuiz = () => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowJustification(false);
        setScore(0);
        setStep("QUIZ");
    };

    // Result screen
    if (step === "RESULT") {
        const percentage = Math.round((score / questions.length) * 100);
        const isPassing = percentage >= 60;

        return (
            <div className="max-w-2xl mx-auto animate-fade-in-up">
                <div className="bg-white rounded-3xl shadow-xl p-12 border border-beige-200 text-center">
                    <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isPassing ? "bg-green-100" : "bg-red-100"
                            }`}
                    >
                        {isPassing ? (
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        ) : (
                            <XCircle className="w-12 h-12 text-red-600" />
                        )}
                    </div>

                    <h2 className="text-3xl font-bold text-beige-900 mb-4">
                        {isPassing ? "أحسنت! 🎉" : "حاول مرة أخرى"}
                    </h2>

                    <p className="text-beige-500 mb-2">{fileName}</p>
                    {unit && <p className="text-beige-400 text-sm mb-4">{unit}</p>}

                    <div className="text-6xl font-bold text-gold-600 mb-2">{percentage}%</div>
                    <p className="text-beige-500 text-lg mb-8">
                        {score} من {questions.length} إجابات صحيحة
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            onClick={resetQuiz}
                            variant="outline"
                            className="px-6 py-3 h-auto rounded-xl font-bold"
                        >
                            إعادة المحاولة
                        </Button>
                        <Link
                            href="/quiz"
                            className="bg-gold-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-gold-600 transition-colors inline-flex items-center justify-center"
                        >
                            العودة للكويزات
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Quiz screen
    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    return (
        <>
            {/* Leave Confirmation Dialog */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>الكويز قيد التقدم</AlertDialogTitle>
                        <AlertDialogDescription>
                            لديك كويز لم يكتمل. هل تريد المغادرة؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>الاستمرار</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmLeave}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            مغادرة
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="max-w-4xl mx-auto animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={handleBackClick}
                        className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2"
                    >
                        <ArrowRight className="w-5 h-5" />
                        <span>الخروج</span>
                    </Button>

                    <div className="text-center">
                        <p className="text-beige-500 text-sm">{fileName}</p>
                        <p className="text-beige-600 font-medium">
                            سؤال {currentIndex + 1} من {questions.length}
                        </p>
                    </div>

                    <div className="w-20" /> {/* Spacer for alignment */}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-beige-100 rounded-full h-2 mb-8">
                    <div
                        className="bg-gold-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200">
                    <h2 className="text-2xl font-bold text-beige-900 mb-8 text-right leading-relaxed">
                        {currentQuestion.question}
                    </h2>

                    {/* Options */}
                    <div className="space-y-4 mb-8">
                        {currentQuestion.options.map((option, index) => {
                            let optionClass =
                                "w-full text-right p-4 rounded-xl border-2 transition-all cursor-pointer ";

                            if (selectedAnswer === null) {
                                optionClass += "border-beige-200 hover:border-gold-300 hover:bg-gold-50";
                            } else if (index === currentQuestion.correctAnswer) {
                                optionClass += "border-green-500 bg-green-50";
                            } else if (index === selectedAnswer && !isCorrect) {
                                optionClass += "border-red-500 bg-red-50";
                            } else {
                                optionClass += "border-beige-200 opacity-50";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSelectAnswer(index)}
                                    disabled={selectedAnswer !== null}
                                    className={optionClass}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedAnswer === null
                                                    ? "bg-beige-100 text-beige-600"
                                                    : index === currentQuestion.correctAnswer
                                                        ? "bg-green-500 text-white"
                                                        : index === selectedAnswer
                                                            ? "bg-red-500 text-white"
                                                            : "bg-beige-100 text-beige-600"
                                                }`}
                                        >
                                            {["أ", "ب", "ج", "د"][index]}
                                        </span>
                                        <span className="text-lg">{option}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Justification */}
                    {showJustification && (
                        <div
                            className={`p-6 rounded-xl mb-6 ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                                }`}
                        >
                            <h3 className={`font-bold mb-2 ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                                {isCorrect ? "إجابة صحيحة! ✓" : "إجابة خاطئة ✗"}
                            </h3>
                            <p className="text-beige-700 mb-3">{currentQuestion.justification}</p>
                            {currentQuestion.example && (
                                <p className="text-beige-600 text-sm border-t border-beige-200 pt-3 mt-3">
                                    <strong>مثال:</strong> {currentQuestion.example}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Next button */}
                    {selectedAnswer !== null && (
                        <div className="flex justify-end">
                            <Button
                                onClick={handleNext}
                                className="bg-gold-500 text-white px-8 py-3 h-auto rounded-xl font-bold hover:bg-gold-600 gap-2"
                            >
                                {currentIndex < questions.length - 1 ? "السؤال التالي" : "عرض النتيجة"}
                                <ArrowRight className="w-5 h-5 rotate-180" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
