"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "./FileUpload";
import { Scroll, Library, Brain, BookOpen } from "lucide-react";
import Link from "next/link";
import { FileData } from "@/lib/types/awn";

export default function HomeContent() {
  const [file, setFile] = useState<FileData | null>(null);
  const router = useRouter();

  const handleFileSelect = (selectedFile: FileData) => {
    setFile(selectedFile);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-beige-900 mb-6">
          عَون
        </h1>
        <p className="text-xl md:text-2xl text-beige-800 font-medium leading-relaxed max-w-2xl mx-auto">
          &quot;وما نيلُ المطالبِ بالتمني... ولكن تُؤخذُ الدُنيا غِلابا&quot;
          <br />
          <span className="text-gold-600 text-lg mt-2 block font-normal">
            رحلة الاجتهاد تبدأ بخطوة، والاستمرار هو سر الوصول.
          </span>
        </p>
      </div>

      {/* Main Action Card */}
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-beige-200 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500 opacity-5 rounded-bl-full"></div>

        <div className="flex flex-col gap-8">
          <FileUpload
            onFileSelect={handleFileSelect}
            onQuizClick={(fileId) => router.push(`/quiz/new?fileId=${fileId}`)}
            onSummaryClick={(fileId) => router.push(`/summary/new?fileId=${fileId}`)}
          />

          {/* Quick Links */}
          {!file && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-beige-100 pt-8">
              <Link
                href="/summary"
                className="flex items-center gap-4 bg-beige-50 border-2 border-beige-200 px-6 py-4 rounded-2xl hover:border-gold-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-white rounded-xl text-gold-600 shadow-sm group-hover:bg-gold-500  transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-right flex-1">
                  <span className="block font-bold text-lg text-beige-900">
                    ملخصاتي
                  </span>
                  <span className="text-sm text-beige-500">
                    استعرض ملخصاتك المحفوظة
                  </span>
                </div>
              </Link>

              <Link
                href="/quiz"
                className="flex items-center gap-4 bg-beige-50 border-2 border-beige-200 px-6 py-4 rounded-2xl hover:border-gold-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 bg-white rounded-xl text-gold-600 shadow-sm group-hover:bg-gold-500  transition-colors">
                  <Brain className="w-6 h-6" />
                </div>
                <div className="text-right flex-1">
                  <span className="block font-bold text-lg text-beige-900">
                    كويزاتي
                  </span>
                  <span className="text-sm text-beige-500">
                    استعرض كويزاتك المحفوظة
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
