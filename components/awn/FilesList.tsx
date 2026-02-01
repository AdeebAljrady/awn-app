"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Clock, BookOpen, Brain, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatHijriDate } from "@/lib/utils/date";

interface FileData {
    id: string;
    file_name: string;
    created_at: string;
}

interface Props {
    files: FileData[];
}

export default function FilesList({ files }: Props) {
    const router = useRouter();
    const [loadingQuiz, setLoadingQuiz] = useState<string | null>(null);
    const [loadingSummary, setLoadingSummary] = useState<string | null>(null);

    const handleQuizClick = (fileId: string) => {
        setLoadingQuiz(fileId);
        router.push(`/quiz/new?fileId=${fileId}`);
    };

    const handleSummaryClick = (fileId: string) => {
        setLoadingSummary(fileId);
        router.push(`/summary/new?fileId=${fileId}`);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {files.map((file) => (
                <div
                    key={file.id}
                    className="bg-white p-6 rounded-2xl border border-beige-200 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-beige-50 rounded-full text-gold-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-beige-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatHijriDate(file.created_at)}</span>
                        </div>
                    </div>

                    <h3 className="font-bold text-lg text-beige-900 mb-4 truncate">
                        {file.file_name}
                    </h3>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSummaryClick(file.id)}
                            disabled={loadingSummary === file.id || loadingQuiz === file.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-beige-100 text-beige-800 py-2 px-3 rounded-lg hover:bg-beige-200 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingSummary === file.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <BookOpen className="w-4 h-4" />
                            )}
                            {loadingSummary === file.id ? "جاري التحميل..." : "تلخيص"}
                        </button>
                        <button
                            onClick={() => handleQuizClick(file.id)}
                            disabled={loadingQuiz === file.id || loadingSummary === file.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-beige-100 text-beige-800 py-2 px-3 rounded-lg hover:bg-beige-200 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingQuiz === file.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Brain className="w-4 h-4" />
                            )}
                            {loadingQuiz === file.id ? "جاري التحميل..." : "كويز"}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
