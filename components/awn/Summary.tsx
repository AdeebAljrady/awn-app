"use client";

import { useState, use } from "react";
import {
  deleteSummary,
  type Summary as SummaryType,
} from "@/app/actions/db/summaries";
import {
  Sparkles,
  Trash2,
  Library,
  BookOpen,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { formatHijriDate } from "@/lib/utils/date";

interface SummaryProps {
  summariesPromise: Promise<SummaryType[]>;
}

export default function Summary({ summariesPromise }: SummaryProps) {
  const initialSummaries = use(summariesPromise);
  const [savedSummaries, setSavedSummaries] = useState<SummaryType[]>(initialSummaries);
  const router = useRouter();

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [summaryToDelete, setSummaryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSummaryToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!summaryToDelete) return;

    setIsDeleting(true);
    try {
      const { success, error } = await deleteSummary(summaryToDelete);
      if (error) {
        toast.error("فشل في حذف التلخيص: " + error);
        return;
      }
      if (success) {
        setSavedSummaries((prev) => prev.filter((s) => s.id !== summaryToDelete));
        toast.success("تم حذف الملخص");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("حدث خطأ أثناء حذف التلخيص");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSummaryToDelete(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2"
        >
          <ArrowRight className="w-5 h-5" />
          العودة
        </Button>
        <h2 className="text-2xl font-bold text-beige-900 flex items-center gap-2">
          <Library className="w-6 h-6 text-gold-500" />
          المكتبة المحفوظة
        </h2>
      </div>

      {savedSummaries.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-white border border-beige-200 shadow-sm">
          <BookOpen className="w-16 h-16 text-beige-300 mx-auto mb-4" />
          <p className="text-beige-600 text-lg mb-4">لا توجد ملخصات محفوظة بعد.</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-gold-500 text-white hover:bg-gold-600 font-bold"
          >
            إنشاء ملخص جديد
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedSummaries.map((saved) => (
            <div
              key={saved.id}
              onClick={() => router.push(`/summary/${saved.id}`)}
              className="bg-white p-6 rounded-2xl border border-beige-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative hover:border-gold-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-beige-50 rounded-full text-gold-600 group-hover:bg-gold-50 transition-colors">
                  <Sparkles className="w-6 h-6" />
                </div>
                <button
                  onClick={(e) => handleDeleteClick(saved.id, e)}
                  className="text-beige-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-2"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-lg text-beige-900 mb-1 line-clamp-1">
                {saved.file_name}
              </h3>
              <p className="text-sm text-beige-500 mb-4 bg-beige-50 inline-block px-2 py-1 rounded-lg">
                {saved.unit || "ملخص شامل"}
              </p>
              <div className="flex items-center gap-2 text-xs text-beige-400 border-t border-beige-100 pt-3 mt-2">
                <Clock className="w-3 h-3" />
                <span>{formatHijriDate(saved.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل تريد حذف هذا الملخص؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الملخص نهائياً ولن تتمكن من استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
