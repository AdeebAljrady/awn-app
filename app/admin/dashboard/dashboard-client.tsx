"use client";

import { useState } from "react";
import { getDashboardStats, getDailyStats } from "@/app/actions/admin/stats";
import {
    Users,
    FileText,
    Brain,
    Coins,
    TrendingUp,
    TrendingDown,
    Calendar,
    Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DashboardStats {
    totalUsers: number;
    newUsersInPeriod: number;
    totalSummaries: number;
    summariesInPeriod: number;
    totalQuizzes: number;
    quizzesInPeriod: number;
    totalCreditsEarned: number;
    totalCreditsSpent: number;
    creditsEarnedInPeriod: number;
    creditsSpentInPeriod: number;
    totalCouponsUsed: number;
    couponsUsedInPeriod: number;
}

interface DailyStats {
    date: string;
    summaries: number;
    quizzes: number;
}

type TimePeriod = "1d" | "7d" | "30d" | "all";

interface AdminDashboardClientProps {
    initialStats: DashboardStats | null;
    initialDailyStats: DailyStats[];
}

export function AdminDashboardClient({ initialStats, initialDailyStats }: AdminDashboardClientProps) {
    const [period, setPeriod] = useState<TimePeriod>("7d");
    const [stats, setStats] = useState<DashboardStats | null>(initialStats);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>(initialDailyStats);
    const [loading, setLoading] = useState(false);

    const getDateRange = (p: TimePeriod) => {
        const end = new Date();
        const start = new Date();

        switch (p) {
            case "1d":
                start.setDate(start.getDate() - 1);
                break;
            case "7d":
                start.setDate(start.getDate() - 7);
                break;
            case "30d":
                start.setDate(start.getDate() - 30);
                break;
            case "all":
                start.setFullYear(2020);
                break;
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        };
    };
    const loadStats = async (newPeriod: TimePeriod) => {
        setLoading(true);
        setPeriod(newPeriod);
        const { startDate, endDate } = getDateRange(newPeriod);

        const [statsResult, dailyResult] = await Promise.all([
            getDashboardStats(startDate, endDate),
            getDailyStats(startDate, endDate),
        ]);

        if (statsResult.data) setStats(statsResult.data);
        if (dailyResult.data) setDailyStats(dailyResult.data);

        setLoading(false);
    };

    const periodLabels: Record<TimePeriod, string> = {
        "1d": "اليوم",
        "7d": "7 أيام",
        "30d": "30 يوم",
        "all": "الكل",
    };

    return (
        <div>
            {/* Header - Stack on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-beige-900">لوحة الإحصائيات</h1>

                {/* Period selector - Scrollable on very small screens */}
                <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg p-1 border border-beige-200 overflow-x-auto">
                    {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
                        <Button
                            key={p}
                            variant={period === p ? "default" : "ghost"}
                            size="sm"
                            onClick={() => loadStats(p)}
                            className={`whitespace-nowrap text-xs sm:text-sm ${period === p ? "bg-gold-500 hover:bg-gold-600" : ""}`}
                        >
                            {periodLabels[p]}
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {/* Stats Cards - 2 columns on mobile, 3 on tablet, 5 on desktop */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
                        {/* Users */}
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200">
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <div className="p-2 lg:p-3 bg-blue-100 rounded-lg lg:rounded-xl">
                                    <Users className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600" />
                                </div>
                                <span className="text-xs lg:text-sm text-green-600 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
                                    +{stats?.newUsersInPeriod}
                                </span>
                            </div>
                            <p className="text-xl lg:text-3xl font-bold text-beige-900">{stats?.totalUsers}</p>
                            <p className="text-beige-500 text-xs lg:text-sm">المستخدمين</p>
                        </div>

                        {/* Summaries */}
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200">
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <div className="p-2 lg:p-3 bg-purple-100 rounded-lg lg:rounded-xl">
                                    <FileText className="w-4 h-4 lg:w-6 lg:h-6 text-purple-600" />
                                </div>
                                <span className="text-xs lg:text-sm text-green-600 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
                                    +{stats?.summariesInPeriod}
                                </span>
                            </div>
                            <p className="text-xl lg:text-3xl font-bold text-beige-900">{stats?.totalSummaries}</p>
                            <p className="text-beige-500 text-xs lg:text-sm">الملخصات</p>
                        </div>

                        {/* Quizzes */}
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200">
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <div className="p-2 lg:p-3 bg-green-100 rounded-lg lg:rounded-xl">
                                    <Brain className="w-4 h-4 lg:w-6 lg:h-6 text-green-600" />
                                </div>
                                <span className="text-xs lg:text-sm text-green-600 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
                                    +{stats?.quizzesInPeriod}
                                </span>
                            </div>
                            <p className="text-xl lg:text-3xl font-bold text-beige-900">{stats?.totalQuizzes}</p>
                            <p className="text-beige-500 text-xs lg:text-sm">الاختبارات</p>
                        </div>

                        {/* Credits */}
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200">
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <div className="p-2 lg:p-3 bg-gold-100 rounded-lg lg:rounded-xl">
                                    <Coins className="w-4 h-4 lg:w-6 lg:h-6 text-gold-600" />
                                </div>
                                <span className="text-xs lg:text-sm text-red-600 flex items-center gap-1">
                                    <TrendingDown className="w-3 h-3 lg:w-4 lg:h-4" />
                                    -{stats?.creditsSpentInPeriod}
                                </span>
                            </div>
                            <p className="text-xl lg:text-3xl font-bold text-beige-900">{stats?.totalCreditsEarned}</p>
                            <p className="text-beige-500 text-xs lg:text-sm">الرصيد</p>
                        </div>

                        {/* Coupons */}
                        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-beige-200 col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <div className="p-2 lg:p-3 bg-pink-100 rounded-lg lg:rounded-xl">
                                    <Gift className="w-4 h-4 lg:w-6 lg:h-6 text-pink-600" />
                                </div>
                                <span className="text-xs lg:text-sm text-green-600 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
                                    +{stats?.couponsUsedInPeriod}
                                </span>
                            </div>
                            <p className="text-xl lg:text-3xl font-bold text-beige-900">{stats?.totalCouponsUsed}</p>
                            <p className="text-beige-500 text-xs lg:text-sm">الكوبونات</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
