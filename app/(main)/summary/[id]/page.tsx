"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSummaryById, type Summary } from "@/app/actions/db/summaries";
import SummaryViewer from "@/components/awn/SummaryViewer";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function SummaryPage() {
    const params = useParams();
    const router = useRouter();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const id = params.id as string;
                if (!id) return;

                const { data, error } = await getSummaryById(id);

                if (error) {
                    setError(error);
                    toast.error(error);
                } else if (data) {
                    setSummary(data);
                } else {
                    setError("لم يتم العثور على التلخيص");
                }
            } catch (err) {
                console.error("Error fetching summary:", err);
                setError("حدث خطأ غير متوقع");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, [params.id]);

    if (isLoading) {
        return <Loading message="جاري تحميل التلخيص..." />;
    }

    if (error || !summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-red-500 font-bold text-lg">{error || "لم يتم العثور على التلخيص"}</p>
                <Button onClick={() => router.push("/summary")} variant="outline" className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    العودة للقائمة
                </Button>
            </div>
        );
    }

    return <SummaryViewer initialSummary={summary} />;
}
