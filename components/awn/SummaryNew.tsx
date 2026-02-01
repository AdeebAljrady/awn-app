"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSummary } from "@/app/actions/db/summaries";
import { toast } from "sonner";
import { Sparkles, Loader2, Save, ArrowRight, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { generateSummaryFromPDF } from "@/app/actions/AI/geminiService";
import { isArabic } from "@/lib/utils";
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
import { Streamdown } from "streamdown";

interface Props {
  initialFile: { id?: string; name: string; url: string; path: string } | null;
}

export default function SummaryNew({ initialFile }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"SETUP" | "LOADING" | "VIEWING">("SETUP");
  const [unitPreference, setUnitPreference] = useState("");
  const [summary, setSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Track if there are unsaved changes (summary generated but not saved)
  const hasUnsavedChanges = step === "VIEWING" && summary.length > 0;

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

  const handleStartSummary = async () => {
    if (!initialFile?.url) {
      toast.error("الملف غير متوفر");
      return;
    }
    setStep("LOADING");
    setIsSaving(true);

    try {
      const result = await generateSummaryFromPDF(
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
        const { id, text } = result.data;
        if (id) {
          toast.success("تم إنشاء التلخيص وحفظه بنجاح!");
          router.push(`/summary/${id}`);
        } else {
          // Fallback if save failed but text exists
          if (result.error) toast.warning(result.error);
          setSummary(text);
          setStep("VIEWING");
        }
      }
    } catch (error) {
      console.error("Summary error:", error);
      toast.error("حدث خطأ أثناء العملية");
      setStep("SETUP");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSummary = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await createSummary(
        initialFile?.name || "ملخص بدون عنوان",
        unitPreference || "كامل الملف",
        summary,
        "",
        initialFile?.id
      );

      if (error) {
        toast.error("فشل في حفظ التلخيص: " + error);
        return;
      }

      if (data) {
        toast.success("تم حفظ التلخيص بنجاح!");
        router.push(`/summary/${data.id}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("حدث خطأ أثناء حفظ التلخيص");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back button with confirmation if unsaved changes
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => setStep("SETUP"));
      setShowLeaveDialog(true);
    } else {
      setStep("SETUP");
    }
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

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

  if (step === "SETUP") {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2 p-0"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة</span>
          </Button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gold-100 rounded-2xl">
              <FileText className="w-8 h-8 text-gold-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-beige-900">إعدادات التلخيص</h2>
              <p className="text-beige-500">{initialFile.name}</p>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-lg font-bold text-beige-900 mb-4">
              ما الجزء الذي تريد تلخيصه؟
            </label>
            <input
              type="text"
              value={unitPreference}
              onChange={(e) => setUnitPreference(e.target.value)}
              placeholder="مثال: الوحدة الأولى، الفصل الثالث، أو اتركه فارغاً لتلخيص كل الملف"
              className="w-full p-4 border-2 border-beige-200 rounded-xl focus:border-gold-500 focus:outline-none text-lg"
            />
          </div>

          <Button
            onClick={handleStartSummary}
            className="w-full bg-gold-500 text-white py-4 h-auto rounded-xl font-bold text-lg hover:bg-gold-600 transition-colors gap-2"
          >
            <Sparkles className="w-5 h-5" />
            بدء التلخيص
          </Button>
        </div>
      </div>
    );
  }

  if (step === "LOADING") {
    return (
      <Loading
        message={`جاري قراءة الملف وتلخيص "${unitPreference || "الكل"}"...`}
        subMessage="قد يستغرق هذا بعض الوقت حسب حجم الملف"
        fullScreen
      />
    );
  }

  return (
    <>
      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              تغييرات غير محفوظة
            </AlertDialogTitle>
            <AlertDialogDescription>
              لديك ملخص لم يتم حفظه. هل تريد المغادرة بدون حفظ؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>البقاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeave}
              className="bg-red-500 hover:bg-red-600"
            >
              مغادرة بدون حفظ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة</span>
          </Button>

          <Button
            onClick={handleSaveSummary}
            disabled={isSaving}
            className="bg-gold-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-gold-600 gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التلخيص</span>
              </>
            )}
          </Button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200">
          <div className="flex items-center gap-4 mb-6">
            <Sparkles className="w-8 h-8 text-gold-500" />
            <div>
              <h2 className="text-2xl font-bold text-beige-900">التلخيص الذكي</h2>
              <p className="text-beige-500">{initialFile.name}</p>
            </div>
          </div>

          <div
            className={`prose prose-lg max-w-none text-beige-800 leading-relaxed ${!isArabic(summary) ? "text-left" : "text-right"
              }`}
            dir={isArabic(summary) ? "rtl" : "ltr"}
            style={{ whiteSpace: "pre-wrap" }}


          >
            <Streamdown components={{
              strong: ({ children }) => (
                <strong className="text-beige-900 bg-beige-100 px-1 rounded font-bold font-sans">
                  {children}
                </strong>
              ),
            }} >
              {summary}
            </Streamdown>
          </div>
        </div>
      </div>
    </>
  );
}
