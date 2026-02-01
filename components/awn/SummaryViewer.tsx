"use client";

import { useState, useEffect, useRef } from "react";
import { updateSummary, deleteSummary, type Summary } from "@/app/actions/db/summaries";
import {
    Sparkles,
    Pen,
    Highlighter,
    Eraser,
    Trash2,
    XCircle,
    Shapes,
    Disc,
    Save,
    ArrowRight,
    Loader2,
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
import { isArabic } from "@/lib/utils";
import { Streamdown } from "streamdown";

interface Props {
    initialSummary: Summary;
}

type ToolType = "pen" | "highlighter" | "eraser" | "laser";

const COLORS = [
    { name: "black", hex: "#000000", label: "أسود" },
    { name: "red", hex: "#EF4444", label: "أحمر" },
    { name: "blue", hex: "#3B82F6", label: "أزرق" },
    { name: "green", hex: "#10B981", label: "أخضر" },
    { name: "gold", hex: "#C5A059", label: "ذهبي" },
    { name: "purple", hex: "#8B5CF6", label: "بنفسجي" },
    { name: "pink", hex: "#EC4899", label: "وردي" },
    { name: "orange", hex: "#F97316", label: "برتقالي" },
    { name: "cyan", hex: "#06B6D4", label: "سماوي" },
    { name: "gray", hex: "#6B7280", label: "رمادي" },
];

type Shape =
    | { type: "line"; x1: number; y1: number; x2: number; y2: number }
    | { type: "rect"; x: number; y: number; w: number; h: number }
    | { type: "ellipse"; x: number; y: number; rx: number; ry: number }
    | { type: "triangle"; x: number; y: number; w: number; h: number };

const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export default function SummaryViewer({ initialSummary }: Props) {
    const router = useRouter();

    const [content, setContent] = useState(initialSummary.content);

    // Drawing State
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [tool, setTool] = useState<ToolType>("pen");
    const [color, setColor] = useState("#000000");
    const [isDrawing, setIsDrawing] = useState(false);

    // Save state
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    // Delete confirmation state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Shape Recognition State
    const strokePointsRef = useRef<{ x: number; y: number }[]>([]);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isShapeSnappedRef = useRef(false);

    // Laser State
    const laserPathRef = useRef<{ x: number; y: number }[]>([]);

    // Load initial drawing data
    useEffect(() => {
        if (initialSummary.drawing_data && canvasRef.current && mainCtxRef.current) {
            // We need to wait for canvas context to be ready (which happens in the other useEffect)
            // But since we can't guarantee order, let's just trigger a reload when the context is set.
        }
    }, [initialSummary]);

    const handleSaveSummary = async () => {
        const canvas = canvasRef.current;
        let drawingData = "";

        if (canvas) {
            drawingData = canvas.toDataURL();
        }

        setIsSaving(true);
        try {
            const result = await updateSummary(initialSummary.id, content, drawingData);
            const { data, error } = result;

            if (error) {
                toast.error("فشل في حفظ التلخيص: " + error);
                return;
            }

            if (data) {
                setHasUnsavedChanges(false);
                toast.success("تم تحديث التلخيص بنجاح!");
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error("حدث خطأ أثناء حفظ التلخيص");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackClick = () => {
        if (hasUnsavedChanges) {
            setPendingNavigation(() => () => router.push("/summary"));
            setShowLeaveDialog(true);
        } else {
            router.push("/summary");
        }
    };

    const confirmLeave = () => {
        setShowLeaveDialog(false);
        if (pendingNavigation) {
            pendingNavigation();
            setPendingNavigation(null);
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { success, error } = await deleteSummary(initialSummary.id);
            if (error) {
                toast.error("فشل في حذف التلخيص: " + error);
                return;
            }
            if (success) {
                toast.success("تم حذف الملخص");
                router.push("/summary");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("حدث خطأ أثناء حذف التلخيص");
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    // Initialize Canvases with High DPI Support & Load Data
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;

        if (!content || !container || !canvas || !tempCanvas) return;

        const setCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            // Important: We need the scrollHeight to cover all the text
            const contentHeight = container.scrollHeight;

            // Only update if dimensions changed to avoid flickering
            if (
                canvas.width !== rect.width * dpr ||
                canvas.height !== contentHeight * dpr
            ) {
                // 1. Update Main Canvas
                canvas.width = rect.width * dpr;
                canvas.height = contentHeight * dpr;
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${contentHeight}px`;

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    mainCtxRef.current = ctx;

                    // REDRAW DATA: If we resized, the canvas was cleared. We must redraw the saved image.
                    if (initialSummary.drawing_data) {
                        const img = new Image();
                        img.src = initialSummary.drawing_data;
                        img.onload = () => {
                            ctx.drawImage(
                                img,
                                0,
                                0,
                                canvas.width / dpr,
                                canvas.height / dpr
                            );
                        };
                    }
                }

                // 2. Update Temp Canvas (Layer for current stroke)
                tempCanvas.width = rect.width * dpr;
                tempCanvas.height = contentHeight * dpr;
                tempCanvas.style.width = `${rect.width}px`;
                tempCanvas.style.height = `${contentHeight}px`;

                const tempCtx = tempCanvas.getContext("2d");
                if (tempCtx) {
                    tempCtx.scale(dpr, dpr);
                    tempCtx.lineCap = "round";
                    tempCtx.lineJoin = "round";
                    tempCtx.imageSmoothingEnabled = true;
                    tempCtx.imageSmoothingQuality = "high";
                    tempCtxRef.current = tempCtx;

                    // Re-apply current tool settings after resize
                    if (tool === "highlighter") {
                        tempCtx.globalCompositeOperation = "multiply";
                        tempCtx.strokeStyle = color;
                        tempCtx.lineWidth = 25;
                        tempCtx.globalAlpha = 0.2;
                    } else if (tool === "eraser") {
                        // temp canvas usually doesn't erase, but just in case
                        tempCtx.lineWidth = 20;
                    } else {
                        tempCtx.strokeStyle = color;
                        tempCtx.lineWidth = 2;
                        tempCtx.globalAlpha = 1;
                    }
                }
            }
        };

        // 1. Initial Call
        setCanvasSize();

        // 2. Observer: Watch for Streamdown to finish rendering or window resizing
        const resizeObserver = new ResizeObserver(() => {
            setCanvasSize();
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [content, initialSummary.drawing_data, tool, color]);
    // Update context properties
    useEffect(() => {
        const updateCtx = (ctx: CanvasRenderingContext2D | null) => {
            if (!ctx) return;

            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";

            if (tool === "eraser") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineWidth = 20;
                ctx.globalAlpha = 1;
            } else if (tool === "highlighter") {
                ctx.globalCompositeOperation = "multiply";
                ctx.strokeStyle = color;
                ctx.lineWidth = 25;
                ctx.globalAlpha = 0.2;
            } else if (tool === "laser") {
                ctx.globalCompositeOperation = "source-over";
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 1;
            }
        };

        updateCtx(mainCtxRef.current);
        updateCtx(tempCtxRef.current);
    }, [tool, color]);

    const getCoordinates = (nativeEvent: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;

        if ("touches" in nativeEvent && nativeEvent.touches.length > 0) {
            clientX = nativeEvent.touches[0].clientX;
            clientY = nativeEvent.touches[0].clientY;
        } else if (
            "changedTouches" in nativeEvent &&
            nativeEvent.changedTouches.length > 0
        ) {
            clientX = nativeEvent.changedTouches[0].clientX;
            clientY = nativeEvent.changedTouches[0].clientY;
        } else if ("clientX" in nativeEvent) {
            clientX = (nativeEvent as MouseEvent).clientX;
            clientY = (nativeEvent as MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const recognizeShape = (points: { x: number; y: number }[]): Shape | null => {
        if (points.length < 10) return null;

        const start = points[0];
        const end = points[points.length - 1];
        const distance = dist(start, end);

        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        points.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const boxArea = width * height;
        const isClosed = distance < Math.max(width, height) * 0.25;

        if (!isClosed) {
            let pathLength = 0;
            for (let i = 1; i < points.length; i++)
                pathLength += dist(points[i - 1], points[i]);

            if (pathLength < dist(start, end) * 1.2) {
                return {
                    type: "line",
                    x1: start.x,
                    y1: start.y,
                    x2: end.x,
                    y2: end.y,
                };
            }
            return null;
        }

        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;

        const ratio = area / boxArea;

        if (ratio > 0.85) {
            return { type: "rect", x: minX, y: minY, w: width, h: height };
        } else if (ratio > 0.65) {
            return {
                type: "ellipse",
                x: minX + width / 2,
                y: minY + height / 2,
                rx: width / 2,
                ry: height / 2,

            };
        } else if (ratio > 0.3) {
            return { type: "triangle", x: minX, y: minY, w: width, h: height };
        }

        return null;
    };

    const drawPerfectShape = (shape: Shape) => {
        const ctx = tempCtxRef.current;
        const canvas = tempCanvasRef.current;
        if (!ctx || !canvas) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        ctx.beginPath();
        if (shape.type === "line") {
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
        } else if (shape.type === "rect") {
            ctx.rect(shape.x, shape.y, shape.w, shape.h);
        } else if (shape.type === "ellipse") {
            ctx.ellipse(shape.x, shape.y, shape.rx, shape.ry, 0, 0, 2 * Math.PI);
        } else if (shape.type === "triangle") {
            ctx.moveTo(shape.x + shape.w / 2, shape.y);
            ctx.lineTo(shape.x, shape.y + shape.h);
            ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
            ctx.closePath();
        }
        ctx.stroke();
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingMode || !tempCtxRef.current) return;
        if (e.cancelable) e.preventDefault();

        setHasUnsavedChanges(true); // Mark as unsaved on edit

        if (tool === "eraser") {
            setIsDrawing(true);
            if (mainCtxRef.current) {
                mainCtxRef.current.beginPath();
                const { x, y } = getCoordinates(e.nativeEvent);
                mainCtxRef.current.moveTo(x, y);
            }
            return;
        }

        const { x, y } = getCoordinates(e.nativeEvent);

        if (tool === "laser") {
            setIsDrawing(true);
            laserPathRef.current = [{ x, y }];
            return;
        }

        tempCtxRef.current.beginPath();
        tempCtxRef.current.moveTo(x, y);

        setIsDrawing(true);
        strokePointsRef.current = [{ x, y }];
        isShapeSnappedRef.current = false;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !isDrawingMode) return;

        // Safety check if we lost context or refs?
        if (!tempCtxRef.current) return;

        const { x, y } = getCoordinates(e.nativeEvent);

        if (tool === "eraser") {
            if (mainCtxRef.current) {
                mainCtxRef.current.lineTo(x, y);
                mainCtxRef.current.stroke();
            }
            return;
        }

        if (tool === "laser") {
            const ctx = tempCtxRef.current;
            const canvas = tempCanvasRef.current;
            if (!ctx || !canvas) return;

            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            laserPathRef.current.push({ x, y });
            if (laserPathRef.current.length > 8) {
                laserPathRef.current.shift();
            }

            if (laserPathRef.current.length > 0) {
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#ff0000";
                ctx.strokeStyle = "#ff0000";
                ctx.fillStyle = "#ff0000";

                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.moveTo(laserPathRef.current[0].x, laserPathRef.current[0].y);
                for (let i = 1; i < laserPathRef.current.length; i++) {
                    ctx.lineTo(laserPathRef.current[i].x, laserPathRef.current[i].y);
                }
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
        }

        if (tempCtxRef.current) {
            if (isShapeSnappedRef.current) return;

            tempCtxRef.current.lineTo(x, y);
            tempCtxRef.current.stroke();
            strokePointsRef.current.push({ x, y });

            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

            if (tool === "pen") {
                holdTimerRef.current = setTimeout(() => {
                    if (!isDrawing) return;
                    const shape = recognizeShape(strokePointsRef.current);
                    if (shape) {
                        drawPerfectShape(shape);
                        isShapeSnappedRef.current = true;
                    }
                }, 500);
            }
        }
    };

    const stopDrawing = () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

        if (tool === "laser") {
            const ctx = tempCtxRef.current;
            const canvas = tempCanvasRef.current;
            if (ctx && canvas) {
                const dpr = window.devicePixelRatio || 1;
                ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            }
            laserPathRef.current = [];
            setIsDrawing(false);
            return;
        }

        if (tool === "eraser") {
            setIsDrawing(false);
            return;
        }

        if (mainCtxRef.current && tempCanvasRef.current) {
            const dpr = window.devicePixelRatio || 1;
            mainCtxRef.current.globalCompositeOperation =
                tool === "highlighter" ? "multiply" : "source-over";
            mainCtxRef.current.globalAlpha = tool === "highlighter" ? 0.2 : 1;

            mainCtxRef.current.drawImage(
                tempCanvasRef.current,
                0,
                0,
                tempCanvasRef.current.width / dpr,
                tempCanvasRef.current.height / dpr
            );

            if (tempCtxRef.current) {
                tempCtxRef.current.clearRect(
                    0,
                    0,
                    tempCanvasRef.current.width / dpr,
                    tempCanvasRef.current.height / dpr
                );
            }
        }

        setIsDrawing(false);
        strokePointsRef.current = [];
        isShapeSnappedRef.current = false;
    };

    const clearCanvas = () => {
        setHasUnsavedChanges(true);
        const dpr = window.devicePixelRatio || 1;
        if (canvasRef.current && mainCtxRef.current) {
            mainCtxRef.current.clearRect(
                0,
                0,
                canvasRef.current.width / dpr,
                canvasRef.current.height / dpr
            );
        }
        if (tempCanvasRef.current && tempCtxRef.current) {
            tempCtxRef.current.clearRect(
                0,
                0,
                tempCanvasRef.current.width / dpr,
                tempCanvasRef.current.height / dpr
            );
        }
    };

    const renderText = (text: string) => {
        return text.split("\n").map((line, i) => {
            const isBullet =
                line.trim().startsWith("*") || line.trim().startsWith("-");
            const cleanLine = line.replace(/^[\*\-]\s*/, "");
            const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

            return (
                <div
                    key={i}
                    className={`mb-3 relative z-0 ${isBullet ? "flex items-start gap-2" : ""
                        }`}
                >
                    {isBullet && <span className="text-gold-500 mt-1.5">•</span>}
                    <p
                        className={`${isBullet ? "flex-1" : ""
                            } text-beige-900 leading-relaxed text-lg`}
                    >
                        {parts.map((part, j) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                                return (
                                    <span
                                        key={j}
                                        className="font-bold text-beige-900 bg-beige-100 px-1 rounded"
                                    >
                                        {part.slice(2, -2)}
                                    </span>
                                );
                            }
                            return part;
                        })}
                    </p>
                </div>
            );
        });
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="flex flex-col mb-6 gap-4">
                <div className="flex justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={handleBackClick}
                        className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2"
                    >
                        <ArrowRight className="w-5 h-5" />
                        <span>العودة للمكتبة</span>
                    </Button>

                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"
                            title="حذف التلخيص"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>

                        <Button
                            onClick={handleSaveSummary}
                            disabled={isSaving}
                            className="bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-bold border border-green-200 gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{isSaving ? "جاري الحفظ..." : "حفظ التلخيص"}</span>
                        </Button>
                    </div>
                </div>

                <div className="w-full bg-white p-3 rounded-2xl shadow-lg border border-beige-200 flex flex-wrap items-center gap-4 transition-all z-30 relative">
                    <button
                        onClick={() => setIsDrawingMode(!isDrawingMode)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-colors whitespace-nowrap shadow-sm ${isDrawingMode
                            ? "bg-gold-500 text-white"
                            : "bg-beige-100 text-beige-800"
                            }`}
                    >
                        {isDrawingMode ? (
                            <XCircle className="w-4 h-4" />
                        ) : (
                            <Pen className="w-4 h-4" />
                        )}
                        {isDrawingMode ? "إيقاف الكتابة" : "تفعيل الكتابة"}
                    </button>


                    {isDrawingMode && (
                        <div className="flex flex-1 flex-wrap items-center gap-4 animate-fade-in-up">
                            <div className="flex items-center bg-beige-50 p-1 rounded-lg border border-beige-100">
                                <button
                                    onClick={() => setTool("pen")}
                                    className={`p-2 rounded-md transition-all ${tool === "pen"
                                        ? "bg-white shadow text-gold-600"
                                        : "text-beige-500"
                                        }`}
                                    title="قلم (اضغط مطولاً للرسم الهندسي)"
                                >
                                    <Pen className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => setTool("highlighter")}
                                    className={`p-2 rounded-md transition-all ${tool === "highlighter"
                                        ? "bg-white shadow text-gold-600"
                                        : "text-beige-500"
                                        }`}
                                    title="تظليل (هايلات)"
                                >
                                    <Highlighter className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => setTool("laser")}
                                    className={`p-2 rounded-md transition-all ${tool === "laser"
                                        ? "bg-white shadow text-red-600 ring-2 ring-red-100"
                                        : "text-beige-500"
                                        }`}
                                    title="ليزر (للشرح)"
                                >
                                    <Disc className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => setTool("eraser")}
                                    className={`p-2 rounded-md transition-all ${tool === "eraser"
                                        ? "bg-white shadow text-red-600"
                                        : "text-beige-500"
                                        }`}
                                    title="ممحاة"
                                >
                                    <Eraser className="w-5 h-5" />
                                </button>
                            </div>

                            <div
                                className={`flex items-center gap-1.5 overflow-x-auto pb-1 max-w-[250px] scrollbar-thin ${tool === "laser"
                                    ? "opacity-30 pointer-events-none grayscale"
                                    : ""
                                    }`}
                            >
                                {COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => setColor(c.hex)}
                                        className={`w-7 h-7 rounded-full border-2 shrink-0 transition-transform ${color === c.hex
                                            ? "border-beige-900 scale-110"
                                            : "border-transparent hover:scale-110"
                                            }`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.label}
                                        disabled={tool === "eraser"}
                                    />
                                ))}
                            </div>

                            {tool === "pen" && (
                                <div className="hidden sm:flex items-center gap-1 text-xs text-beige-500 bg-beige-50 px-2 py-1 rounded">
                                    <Shapes className="w-3 h-3" />
                                    <span>اضغط مطولاً لتحويل الشكل</span>
                                </div>
                            )}
                            {tool === "laser" && (
                                <div className="hidden sm:flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded font-bold">
                                    <Disc className="w-3 h-3" />
                                    <span>ليزر للشرح (لا يحفظ)</span>
                                </div>
                            )}

                            <div className="flex-1"></div>

                            <button
                                onClick={clearCanvas}
                                className="flex items-center gap-1 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                مسح الكل
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-beige-200 relative">
                <div className="bg-beige-900 p-6  flex items-center gap-4">
                    <Sparkles className="w-8 h-8 text-gold-500" />
                    <div>
                        <h2 className="text-2xl font-bold">{initialSummary.file_name}</h2>
                        <p className="text-beige-300 text-sm">
                            {initialSummary.unit ? `ملخص: ${initialSummary.unit}` : "ملخص شامل"}
                        </p>
                    </div>
                </div>

                <div className="relative min-h-[800px]  border-beige-200 border-t">
                    <div
                        ref={containerRef}
                        aria-label="Summary Content"
                        dir={isArabic(content) ? "rtl" : "ltr"}
                        className={`p-8 prose prose-lg prose-beige max-w-none relative z-10 ${isDrawingMode ? "select-none" : ""
                            } ${!isArabic(content) ? "text-left" : "text-right"}`}
                    >
                        <Streamdown components={{
                            strong: ({ children }) => (
                                <strong className="text-beige-900 bg-beige-100 px-1 rounded font-bold font-sans">
                                    {children}
                                </strong>
                            ),
                        }} >
                            {content}
                        </Streamdown>
                    </div>

                    <canvas
                        ref={canvasRef}
                        style={{
                            pointerEvents: "none",
                            touchAction: "none",
                        }}
                        className="absolute top-0 left-0 w-full h-full z-20"
                    />

                    <canvas
                        ref={tempCanvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        style={{
                            pointerEvents: isDrawingMode ? "auto" : "none",
                            touchAction: "none",
                        }}
                        className={`absolute top-0 left-0 w-full h-full z-30 ${isDrawingMode
                            ? tool === "laser"
                                ? "cursor-none"
                                : "cursor-crosshair"
                            : ""
                            }`}
                    />
                </div>
            </div>

            {/* Unsaved Changes Dialog */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل تريد المغادرة بدون حفظ؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            لديك تغييرات غير محفوظة. إذا غادرت الآن، ستفقد التلخيص والملاحظات التي أضفتها.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>
                            البقاء
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmLeave}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            المغادرة بدون حفظ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
