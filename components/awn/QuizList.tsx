"use client";

import { useState } from "react";
import { Brain, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatHijriDate } from "@/lib/utils/date";
import { deleteQuiz, type Quiz } from "@/app/actions/db/quizzes";
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

interface Props {
    quizzes: Quiz[];
}

export default function QuizList({ quizzes: initialQuizzes }: Props) {
    const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setQuizToDelete(id);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!quizToDelete) return;

        setIsDeleting(true);
        const { success, error } = await deleteQuiz(quizToDelete);

        if (success) {
            setQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete));
            toast.success("تم حذف الكويز بنجاح");
        } else {
            toast.error(error || "فشل في حذف الكويز");
        }

        setIsDeleting(false);
        setShowDeleteDialog(false);
        setQuizToDelete(null);
    };

    return (
        <>
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف الكويز</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من حذف هذا الكويز؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isDeleting ? "جاري الحذف..." : "حذف"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quizzes.map((quiz) => (
                    <Link
                        key={quiz.id}
                        href={`/quiz/${quiz.id}`}
                        className="bg-white p-6 rounded-2xl border border-beige-200 shadow-sm hover:shadow-md transition-shadow group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-beige-50 rounded-full text-gold-600 group-hover:bg-gold-100 transition-colors">
                                <Brain className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-xs text-beige-400">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatHijriDate(quiz.created_at)}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteClick(quiz.id, e)}
                                    className="p-2 text-beige-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="حذف الكويز"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-bold text-lg text-beige-900 mb-1 truncate">
                            {quiz.file_name}
                        </h3>
                        {quiz.unit && (
                            <p className="text-sm text-beige-500 mb-2">{quiz.unit}</p>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-beige-100">
                            <span className="text-sm text-gold-600 font-medium">
                                اضغط لإعادة الاختبار
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}
