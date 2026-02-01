"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createQuiz, saveQuizAttempt } from "@/app/actions/db/quizzes";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Save,
  ArrowRight,
  FileText,
  AlertTriangle,
  Brain,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { generateQuizFromDocument } from "@/app/actions/AI/geminiService";
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

interface Props {
  initialFile: {
    id: string;
    name: string;
    url: string;
    path: string;
  } | null;
}

type Step = "SETUP" | "LOADING" | "QUIZ" | "RESULT";

const QUIZ_LOADING_MESSAGES = [
  "جاري قراءة المستند وتحليل بياناته...",
  "جاري استخراج أهم المعلومات لإنشاء الأسئلة...",
  "جاري صياغة أسئلة متنوعة وشاملة...",
  "جاري إعداد الخيارات والإجابات الصحيحة...",
  "جاري كتابة الشروحات والأمثلة التوضيحية لكل سؤال...",
  "لحظات ويصبح اختبارك جاهزاً...",
];

export default function QuizNew({ initialFile }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("SETUP");
  const [unitPreference, setUnitPreference] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showJustification, setShowJustification] = useState(false);
  const [score, setScore] = useState(0);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Cycle through loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "LOADING") {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % QUIZ_LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
      setLoadingMessageIndex(0);
    };
  }, [step]);

  // Track if there are unsaved changes
  const hasUnsavedChanges = step === "QUIZ" && questions.length > 0;

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleStartQuiz = async () => {
    if (!initialFile?.url) {
      toast.error("الملف غير متوفر");
      return;
    }
    setStep("LOADING");

    try {
      const result = await generateQuizFromDocument(
        initialFile.url,
        unitPreference,
        initialFile.name,
        initialFile.id
      );

      if (result.error && !result.data) {
        toast.error(result.error);
        setStep("SETUP");
        return;
      }

      if (result.data) {
        const { questions: generatedQuestions, id } = result.data;
        setQuestions(generatedQuestions);

        if (id) {
          setSavedQuizId(id);
          toast.success("تم إنشاء وحفظ الكويز بنجاح!");
        } else if (result.error) {
          toast.warning(result.error);
        }

        setStep("QUIZ");
      }
    } catch (error) {
      console.error("Quiz error:", error);
      toast.error("حدث خطأ غير متوقع أثناء إنشاء الكويز");
      setStep("SETUP");
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (selectedAnswer !== null) return; // Already answered
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
      // Quiz finished - save attempt
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    setStep("RESULT");

    if (savedQuizId) {
      const { error } = await saveQuizAttempt(savedQuizId, score, questions.length);
      if (error) {
        console.error("Failed to save attempt:", error);
      }
    }
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => router.push("/quiz"));
      setShowLeaveDialog(true);
    } else {
      router.push("/quiz");
    }
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // No file selected
  if (!initialFile) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200">
          <FileText className="w-16 h-16 text-beige-300 mx-auto mb-4" />
          <p className="text-beige-600 text-lg mb-4">لم يتم تحديد ملف</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/files"
              className="bg-gold-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-gold-600 transition-colors"
            >
              اختر من ملفاتي
            </Link>
            <Link
              href="/"
              className="bg-beige-100 text-beige-800 px-6 py-2 rounded-xl font-bold hover:bg-beige-200 transition-colors"
            >
              رفع ملف جديد
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Setup step
  if (step === "SETUP") {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gold-100 rounded-2xl">
              <Brain className="w-8 h-8 text-gold-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-beige-900">إعدادات الكويز</h2>
              <p className="text-beige-500">{initialFile.name}</p>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-lg font-bold text-beige-900 mb-4">
              ما الجزء الذي تريد الاختبار فيه؟
            </label>
            <input
              type="text"
              value={unitPreference}
              onChange={(e) => setUnitPreference(e.target.value)}
              placeholder="مثال: الوحدة الأولى، الفصل الثالث، أو اتركه فارغاً للكل"
              className="w-full p-4 border-2 border-beige-200 rounded-xl focus:border-gold-500 focus:outline-none text-lg"
            />
          </div>

          <Button
            onClick={handleStartQuiz}
            className="w-full bg-gold-500 text-white py-4 h-auto rounded-xl font-bold text-lg hover:bg-gold-600 transition-colors gap-2"
          >
            <Sparkles className="w-5 h-5" />
            بدء الكويز
          </Button>
        </div>
      </div>
    );
  }

  // Loading step
  if (step === "LOADING") {
    return (
      <Loading
        message={QUIZ_LOADING_MESSAGES[loadingMessageIndex]}
        subMessage={unitPreference ? `نختبرك الآن في "${unitPreference}"` : "سوف نقوم بإنشاء اختبار شامل لك بكامل المستند"}
        fullScreen
      />
    );
  }

  // Result step
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

          <div className="text-6xl font-bold text-gold-600 mb-2">{percentage}%</div>
          <p className="text-beige-500 text-lg mb-8">
            {score} من {questions.length} إجابات صحيحة
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => {
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setShowJustification(false);
                setScore(0);
                setStep("QUIZ");
              }}
              variant="outline"
              className="px-6 py-3 h-auto rounded-xl font-bold"
            >
              إعادة المحاولة
            </Button>
            <Link
              href="/quiz"
              className="bg-gold-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-gold-600 transition-colors"
            >
              العودة للكويزات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Quiz step
  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  return (
    <>
      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              الكويز قيد التقدم
            </AlertDialogTitle>
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

          <div className="text-beige-600 font-medium">
            سؤال {currentIndex + 1} من {questions.length}
          </div>
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
