import { getDashboardStats, getDailyStats } from "@/app/actions/admin/stats";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminDashboard() {
  // Fetch default 7-day stats on server
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const [statsResult, dailyResult] = await Promise.all([
    getDashboardStats(start.toISOString(), end.toISOString()),
    getDailyStats(start.toISOString(), end.toISOString()),
  ]);

  return (
    <AdminDashboardClient
      initialStats={statsResult.data || null}
      initialDailyStats={dailyResult.data || []}
    />
  );
}
