"use client";

import { useEffect, useState } from "react";
import { Coins, ArrowRight, Clock, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { getUserCredits, getCreditTransactions, type CreditTransaction } from "@/app/actions/db/credits";
import RedeemCoupon from "@/components/awn/RedeemCoupon";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { useRouter } from "next/navigation";
import { formatHijriDate } from "@/lib/utils/date";

export default function CreditsPageClient() {
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadData = async () => {
    try {
      const [creditsResult, transactionsResult] = await Promise.all([
        getUserCredits(),
        getCreditTransactions(),
      ]);

      if (creditsResult.data) {
        setBalance(creditsResult.data.balance);
        setTotalEarned(creditsResult.data.total_earned);
        setTotalSpent(creditsResult.data.total_spent);
      }

      if (transactionsResult.data) {
        setTransactions(transactionsResult.data);
      }
    } catch (error) {
      console.error("Failed to load credits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCouponSuccess = (credits: number, newBalance: number) => {
    setBalance(newBalance);
    setTotalEarned((prev) => prev + credits);
    // Reload transactions
    loadData();
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case "coupon":
        return "كوبون";
      case "summary":
        return "تلخيص";
      case "quiz":
        return "كويز";
      case "refund":
        return "استرداد";
      default:
        return actionType;
    }
  };

  const getActionTypeColor = (actionType: string, amount: number) => {
    if (amount > 0) {
      return "text-green-600 bg-green-50";
    }
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <Loading fullScreen />
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-beige-600 hover:text-beige-900 hover:bg-transparent gap-2"
        >
          <ArrowRight className="w-5 h-5" />
          العودة
        </Button>
        <h1 className="text-3xl font-bold text-beige-900 flex items-center gap-3">
          <Coins className="w-8 h-8 text-gold-500" />
          رصيدي
        </h1>
      </div>

      {/* Balance Card */}
      <div className="rounded-3xl p-8  mb-8 shadow-xl">
        <div className="text-center">
          <p className=" mb-2">الرصيد الحالي</p>
          <p className="text-6xl font-bold mb-4">{balance}</p>
          <p className="text-gold-200 text-sm">رصيد</p>
        </div>


      </div>

      {/* Redeem Coupon Section */}
      <div className="mb-8">
        <RedeemCoupon onSuccess={handleCouponSuccess} />
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6">
        <h2 className="text-xl font-bold text-beige-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold-500" />
          سجل العمليات
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-10 text-beige-400">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد عمليات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-beige-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${getActionTypeColor(
                      tx.action_type,
                      tx.amount
                    )}`}
                  >
                    {tx.amount > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-beige-900">
                      {getActionTypeLabel(tx.action_type)}
                    </p>
                    <p className="text-xs text-beige-500">
                      {tx.description || "—"}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p
                    className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </p>
                  <p className="text-xs text-beige-400">
                    {formatHijriDate(tx.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
