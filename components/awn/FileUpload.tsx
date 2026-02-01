"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { File as FileIcon, FileSpreadsheet, X, Brain, Scroll, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUppy } from "@/hooks/use-uppy";
import { createUploadedFile } from "@/app/actions/db/files";
import { FileData } from "@/lib/types/awn";

interface FileUploadProps {
  onFileSelect: (file: FileData) => void;
  onQuizClick?: (fileId: string) => void;
  onSummaryClick?: (fileId: string) => void;
}

export default function FileUpload({
  onFileSelect,
  onQuizClick,
  onSummaryClick,
}: FileUploadProps) {
  const { uppy, isReady } = useUppy({ bucketName: "awn" });

  const [uploadState, setUploadState] = useState<{
    file: File | null;
    progress: number;
    uploading: boolean;
    complete: boolean;
    fileUrl: string | null;
    fileId: string | null;
  }>({
    file: null,
    progress: 0,
    uploading: false,
    complete: false,
    fileUrl: null,
    fileId: null,
  });

  const [processingType, setProcessingType] = useState<"NONE" | "QUIZ" | "SUMMARY">("NONE");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAction = (type: "QUIZ" | "SUMMARY", fileId: string) => {
    setProcessingType(type);
    if (type === "QUIZ" && onQuizClick) onQuizClick(fileId);
    if (type === "SUMMARY" && onSummaryClick) onSummaryClick(fileId);
  };

  // Initialize Uppy listeners
  useEffect(() => {
    if (!isReady || !uppy) return;

    uppy.on("upload-progress", (file, progress) => {
      const bytesTotal = progress.bytesTotal || 1; // Prevent division by zero or null
      setUploadState((prev) => ({
        ...prev,
        progress: Math.floor((progress.bytesUploaded / bytesTotal) * 100),
        uploading: true
      }));
    });

    uppy.on("upload-success", async (file, response) => {
      if (!file) return;
      const storagePath = file.meta.objectName as string;
      // Construct public URL - for private buckets we need signed URL but for initial client side we might use this
      // Actually we will get the signed URL from the createUploadedFile action if we need it, or we construct it.
      // The previous logic used signed URLs.

      // Since TUS upload doesn't return the signed URL in response directly the same way the simple upload does,
      // We will perform the DB recording with the path.

      try {
        const { data, error } = await createUploadedFile(
          file.name || "unknown",
          storagePath,
          response.uploadURL || "", // TUS might return an upload URL but we often just rely on path.
          file.size || undefined,
          file.type
        );

        if (error) {
          console.error("DB Save Error:", error);
          toast.error("فشل في حفظ الملف في قاعدة البيانات");
          return;
        }

        const fileData: FileData = {
          name: file.name || "unknown",
          content: "",
          type: file.type,
          url: data?.file_url || "",
        };

        setUploadState((prev) => ({
          ...prev,
          progress: 100,
          uploading: false,
          complete: true,
          fileUrl: fileData.url || null, // Ensure strict null if empty string
          fileId: data?.id || null,
        }));

        onFileSelect(fileData);
        toast.success("تم رفع الملف بنجاح");
      } catch (err) {
        console.error("Post-upload processing error", err);
        toast.error("حدث خطأ أثناء معالجة الملف");
      }
    });

    uppy.on("upload-error", (file, error) => {
      console.error("Uppy Upload Error:", error);
      toast.error("فشل في رفع الملف");
      setUploadState((prev) => ({ ...prev, uploading: false }));
    });

    return () => {
      // Cleanup listeners handled by Uppy internally or when uppy instance changes
    };
  }, [uppy, isReady, onFileSelect]);


  const handleFile = (file: File | undefined) => {
    if (!file) return;

    // Validate type - PDF, DOCX, PPTX
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("يرجى رفع ملف بصيغة PDF أو Word أو PowerPoint فقط", {
        position: "bottom-center",
        duration: 3000,
      });
      return;
    }

    setUploadState((prev) => ({
      ...prev,
      file,
      progress: 0,
      uploading: true,
      complete: false,
      fileUrl: null,
      fileId: null
    }));

    // Add file to Uppy and start upload
    try {
      uppy.cancelAll(); // Clear previous files
      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
      });
      // uppy.upload() is handled by autoProceed: true
    } catch (err: any) {
      console.error("Uppy Add File Error:", err);
      toast.error(err?.message || "Error starting upload");
      setUploadState((prev) => ({ ...prev, uploading: false, file: null }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0]);
  };

  const resetFile = () => {
    uppy.cancelAll();
    setUploadState({
      file: null,
      progress: 0,
      uploading: false,
      complete: false,
      fileUrl: null,
      fileId: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!uploadState.file) return <FileIcon />;
    return <FileIcon className="h-5 w-5 text-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const { file, progress, uploading, complete, fileId } = uploadState;

  // -- Render Success Actions (Quiz / Summary) --
  if (complete && fileId) {
    return (
      <div className="w-full max-w-xl mx-auto mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="w-full bg-muted/30 p-6 rounded-xl border border-dashed border-green-500/50 mb-6 bg-green-50/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
              <FileIcon className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{file?.name}</p>
              <p className="text-xs text-muted-foreground">{file ? formatFileSize(file.size) : ""}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFile}
              disabled={processingType !== "NONE"}
              className="h-8 w-8 text-green-700 hover:text-green-800 hover:bg-green-200"
            >
              <RefreshCw className={cn("h-4 w-4", processingType !== "NONE" && "animate-spin")} />
            </Button>
          </div>
          <div className="text-center text-green-700 font-medium pb-2 text-sm">
            ✓ تم رفع الملف بنجاح! اختر نوع المعالجة:
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Button
            variant="ghost"
            disabled={processingType !== "NONE"}
            onClick={() => handleAction("QUIZ", fileId)}
            className="group relative bg-white hover:bg-slate-50 p-6 h-auto rounded-2xl border border-border transition-all duration-300 flex flex-col items-center gap-4 shadow-sm hover:shadow-md disabled:opacity-70"
          >
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              {processingType === "QUIZ" ? (
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              ) : (
                <Brain className="w-8 h-8 text-indigo-600" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-800">اختبار ذكي</h3>
            <p className="text-sm text-gray-500">اختبارات تفاعلية من محتوى ملفك</p>
          </Button>

          <Button
            variant="ghost"
            disabled={processingType !== "NONE"}
            onClick={() => handleAction("SUMMARY", fileId)}
            className="group relative bg-white hover:bg-slate-50 p-6 h-auto rounded-2xl border border-border transition-all duration-300 flex flex-col items-center gap-4 shadow-sm hover:shadow-md disabled:opacity-70"
          >
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              {processingType === "SUMMARY" ? (
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              ) : (
                <Scroll className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-800">تلخيص إبداعي</h3>
            <p className="text-sm text-gray-500">شرح مبسط وواضح للنقاط الأساسية</p>
          </Button>
        </div>
      </div>
    );
  }

  // -- Render Upload / Progress State --
  return (
    <div className="flex items-center justify-center p-4 w-full max-w-xl mx-auto">
      <form className="w-full" onSubmit={(e) => e.preventDefault()}>
        {!file ? (
          <div
            onClick={() => isReady && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all duration-300 ${isReady ? "border-gold-500/30 bg-gold-50/10 hover:bg-gold-50/30 cursor-pointer" : "opacity-50 cursor-not-allowed border-gray-200"}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-white/50 rounded-full shadow-sm">
                <FileIcon className="h-8 w-8 text-gold-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  <span className="font-semibold text-gold-600 hover:text-gold-500">
                    اختر ملفًا
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={!isReady}
                    onClick={(e) => e.stopPropagation()} // Prevent double-triggering
                  />
                  <span className="text-muted-foreground"> أو اسحبه هنا</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, PowerPoint (الحد الأقصى 47 ميجابايت)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Card className="relative bg-background p-4 gap-4 border-muted">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-foreground z-10"
              aria-label="Remove"
              onClick={resetFile}
              disabled={uploading && progress > 90} // Disable cancel if almost done
            >
              <X className="h-4 w-4 shrink-0" aria-hidden={true} />
            </Button>

            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-muted-foreground/10">
                {getFileIcon()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Progress value={progress} className="h-2 w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{uploading ? "جاري الرفع..." : "جاهز"}</span>
                <span>{progress}%</span>
              </div>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}

