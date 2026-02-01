import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
    message?: string;
    subMessage?: string;
    className?: string;
    fullScreen?: boolean;
}

export function Loading({
    message = "جاري التحميل...",
    subMessage,
    className,
    fullScreen = false
}: LoadingProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center space-y-6",
                fullScreen ? "h-[500px]" : "h-64",
                className
            )}
        >
            <div className="relative text-[#d4af37]">
                {/* Outer glowing ring */}
                <div className="absolute inset-0 rounded-full blur-md bg-[#d4af37]/20 animate-pulse"></div>
                {/* Main spinner */}
                <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div className="text-center space-y-2">
                {message && (
                    <h3 className="text-xl font-bold text-beige-900 animate-pulse">
                        {message}
                    </h3>
                )}
                {subMessage && (
                    <p className="text-beige-500 text-sm max-w-md mx-auto">{subMessage}</p>
                )}
            </div>
        </div>
    );
}
