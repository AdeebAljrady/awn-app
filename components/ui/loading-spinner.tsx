interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "w-6 h-6 border-2",
        md: "w-12 h-12 border-4",
        lg: "w-16 h-16 border-4",
    };

    return (
        <div className={`flex items-center justify-center h-64 ${className}`}>
            <div
                className={`${sizeClasses[size]} border-yellow-500 border-t-transparent rounded-full animate-spin`}
            />
        </div>
    );
}
