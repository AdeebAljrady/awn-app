import { getAllCoupons, getCreditSettings } from "@/app/actions/admin/credits";
import { AdminCreditsClient } from "./credits-client";

export default async function AdminCreditsPage() {
  // Fetch initial data on server
  const [settingsResult, couponsResult] = await Promise.all([
    getCreditSettings(),
    getAllCoupons(),
  ]);

  return (
    <AdminCreditsClient
      initialSettings={settingsResult.data || []}
      initialCoupons={couponsResult.data || []}
    />
  );
}
