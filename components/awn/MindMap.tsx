"use client";

import { useState, useEffect } from "react";
import { generateMindMapFromPDF } from "@/app/actions/AI/geminiService";
import { FileData, MindMapNode } from "@/lib/types/awn";
import { ArrowLeft, ZoomIn, ZoomOut, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MindMapProps {
  file: FileData;
  onBack: () => void;
}

const TreeNode: React.FC<{
  node: MindMapNode;
  depth?: number;
}> = ({ node, depth = 0 }) => {
  const isRoot = depth === 0;
  const isCategory = depth === 1;
  const isItem = depth > 1;

  if (isItem) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg border border-beige-200 shadow-sm text-sm text-beige-900 font-medium w-full text-center">
        {node.label}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Node Box */}
      <div
        className={`
          relative p-4 rounded-xl shadow-md border-2 transition-all
          ${
            isRoot
              ? "bg-beige-900 text-white border-gold-500 text-xl font-bold min-w-[250px] text-center z-10"
              : ""
          }
          ${
            isCategory
              ? "bg-gold-500 text-white border-beige-900 text-lg font-bold min-w-[200px] text-center z-10"
              : ""
          }
        `}
      >
        {node.label}
      </div>

      {/* Children Container */}
      {node.children && node.children.length > 0 && (
        <div className="relative flex flex-col items-center mt-6">
          {isRoot && (
            <>
              {/* Vertical Line from Root */}
              <div className="w-0.5 h-6 bg-beige-300 absolute -top-6"></div>

              {/* Horizontal Bar for Categories */}
              <div className="flex gap-12 pt-6 relative">
                {node.children.length > 1 && (
                  <div className="absolute top-0 left-10 right-10 h-0.5 bg-beige-300"></div>
                )}

                {node.children.map((child, idx) => (
                  <div
                    key={child.id || idx}
                    className="relative flex flex-col items-center"
                  >
                    {/* Vertical line connecting to horizontal bar */}
                    <div className="absolute -top-6 w-0.5 h-6 bg-beige-300"></div>
                    <TreeNode node={child} depth={depth + 1} />
                  </div>
                ))}
              </div>
            </>
          )}

          {isCategory && (
            <>
              {/* Vertical Stack for List Items */}
              <div className="w-0.5 h-4 bg-beige-300"></div>
              <div className="flex flex-col gap-2 w-full min-w-[200px]">
                {node.children.map((child, idx) => (
                  <div key={child.id || idx} className="relative">
                    {/* Small connector if we wanted, but simple stack is cleaner */}
                    <div className="bg-white hover:bg-beige-50 px-4 py-3 rounded-lg border border-beige-200 shadow-sm text-sm text-beige-900 font-medium text-center transition-colors">
                      {child.label}
                    </div>
                    {idx < (node.children?.length || 0) - 1 && (
                      <div className="w-0.5 h-2 bg-beige-200 mx-auto"></div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function MindMap({ file, onBack }: MindMapProps) {
  const [data, setData] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(0.9);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!file.base64) {
        setError("الملف غير متوفر");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const rootNode = await generateMindMapFromPDF(file.base64);
        setData(rootNode);
      } catch (err) {
        setError(
          "عذراً، حدث خطأ أثناء إنشاء الخريطة. تأكد أن الملف يحتوي على تعدادات واضحة."
        );
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [file]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-bold text-beige-900">
          جاري استخراج التعدادات والقوائم...
        </h3>
        <p className="text-beige-600 mt-2">
          نقوم بفلترة النصوص والتركيز على النقاط المهمة فقط
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="text-red-500 text-xl font-bold mb-4">{error}</div>
        <Button
          variant="link"
          onClick={onBack}
          className="text-beige-900 underline hover:text-beige-700"
        >
          العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-beige-50 overflow-hidden relative">
      {/* Header */}
      <div className="bg-white p-4 shadow-md flex justify-between items-center z-20">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة
        </Button>
        <h2 className="text-xl font-bold text-beige-900 flex items-center gap-2">
          <List className="w-6 h-6 text-gold-500" />
          خرائط التعداد: {file.name}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="bg-beige-100 rounded hover:bg-beige-200"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            className="bg-beige-100 rounded hover:bg-beige-200"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className="flex-1 overflow-auto cursor-grab active:cursor-grabbing bg-[#FDFCF5] relative p-20">
        <div
          className="min-w-max min-h-max flex justify-center origin-top transition-transform duration-200 ease-out mx-auto"
          style={{ transform: `scale(${scale})` }}
        >
          {data && <TreeNode node={data} />}
        </div>
      </div>

      {/* Helper text */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full text-xs text-beige-500 shadow-sm pointer-events-none">
        الخريطة تعرض التعدادات والقوائم فقط لاختصار المذاكرة
      </div>
    </div>
  );
}


