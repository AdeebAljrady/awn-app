"use server";

import { requireAdmin } from "./auth";
import { createClientAdmin } from "@/lib/supabase/admin";

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
  users: number;
  summaries: number;
  quizzes: number;
  creditsEarned: number;
  creditsSpent: number;
}

/**
 * Get dashboard statistics with time period filter
 * Uses the database function get_dashboard_stats() for efficiency
 */
export async function getDashboardStats(
  startDate: string,
  endDate: string
): Promise<{ data: DashboardStats | null; error: string | null }> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    
    // Use the database function for all stats in a single query
    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      start_date: startDate,
      end_date: endDate,
    });
    
    if (error) {
      console.error("Dashboard stats error:", error);
      return { data: null, error: error.message };
    }
    
    // The function returns an array with one row
    const stats = data?.[0];
    
    if (!stats) {
      return { data: null, error: "لا توجد بيانات" };
    }
    
    return {
      data: {
        totalUsers: stats.total_users || 0,
        newUsersInPeriod: stats.new_users_in_period || 0,
        totalSummaries: stats.total_summaries || 0,
        summariesInPeriod: stats.summaries_in_period || 0,
        totalQuizzes: stats.total_quizzes || 0,
        quizzesInPeriod: stats.quizzes_in_period || 0,
        totalCreditsEarned: stats.total_credits_earned || 0,
        totalCreditsSpent: stats.total_credits_spent || 0,
        creditsEarnedInPeriod: stats.credits_earned_in_period || 0,
        creditsSpentInPeriod: stats.credits_spent_in_period || 0,
        totalCouponsUsed: stats.total_coupons_used || 0,
        couponsUsedInPeriod: stats.coupons_used_in_period || 0,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Get daily statistics for charts
 */
export async function getDailyStats(
  startDate: string,
  endDate: string
): Promise<{ data: DailyStats[] | null; error: string | null }> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    
    // Get summaries by day
    const { data: summaries } = await supabase
      .from("summaries")
      .select("created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate);
    
    // Get quizzes by day
    const { data: quizzes } = await supabase
      .from("quiz_attempts")
      .select("completed_at")
      .gte("completed_at", startDate)
      .lte("completed_at", endDate);
    
    // Get transactions by day
    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("created_at, amount")
      .gte("created_at", startDate)
      .lte("created_at", endDate);
    
    // Group by date
    const dailyMap = new Map<string, DailyStats>();
    
    // Initialize dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        users: 0,
        summaries: 0,
        quizzes: 0,
        creditsEarned: 0,
        creditsSpent: 0,
      });
    }
    
    // Count summaries
    summaries?.forEach((s) => {
      const date = new Date(s.created_at).toISOString().split("T")[0];
      const stats = dailyMap.get(date);
      if (stats) stats.summaries++;
    });
    
    // Count quizzes
    quizzes?.forEach((q) => {
      const date = new Date(q.completed_at).toISOString().split("T")[0];
      const stats = dailyMap.get(date);
      if (stats) stats.quizzes++;
    });
    
    // Sum transactions
    transactions?.forEach((t) => {
      const date = new Date(t.created_at).toISOString().split("T")[0];
      const stats = dailyMap.get(date);
      if (stats) {
        if (t.amount > 0) {
          stats.creditsEarned += t.amount;
        } else {
          stats.creditsSpent += Math.abs(t.amount);
        }
      }
    });
    
    return {
      data: Array.from(dailyMap.values()),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

/**
 * Get recent activity logs (admin only)
 */
export async function getRecentActivity(
  page: number = 1,
  pageSize: number = 50,
  actionType: string = ""
): Promise<{ data: { logs: unknown[]; total: number } | null; error: string | null }> {
  try {
    await requireAdmin();
    
    const supabase = await createClientAdmin();
    const offset = (page - 1) * pageSize;
    
    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (actionType) {
      query = query.eq("action_type", actionType);
    }
    
    const { data: logs, error, count } = await query;
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return {
      data: { logs: logs || [], total: count || 0 },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
