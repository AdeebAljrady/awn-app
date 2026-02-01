"use client";

import { useState } from "react";
import { Gift, Loader2, CheckCircle, XCircle } from "lucide-react";
import { redeemCoupon } from "@/app/actions/db/coupons";
import { Button } from "@/components/ui/button";

interface RedeemCouponProps {
  onSuccess?: (credits: number, newBalance: number) => void;
}

export default function RedeemCoupon({ onSuccess }: RedeemCouponProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    credits?: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const { success, credits, newBalance, error } = await redeemCoupon(code);
      if (success) {
        setResult({
          success: true,
          message: `تم إضافة ${credits} رصيد بنجاح! الرصيد الجديد: ${newBalance}`,
          credits,
        });
        setCode("");
        onSuccess?.(credits, newBalance);
      } else {
        setResult({
          success: false,
          message: error || "حدث خطأ أثناء استخدام الكوبون",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "حدث خطأ غير متوقع",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gold-50 rounded-full">
          <Gift className="w-6 h-6 text-gold-600" />
        </div>
        <h3 className="text-lg font-bold text-beige-900">استخدام كوبون</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="أدخل رمز الكوبون هنا..."
            className="w-full p-3 border border-beige-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-beige-50 text-center font-mono text-lg tracking-wider"
            maxLength={50}
            disabled={loading}
            dir="ltr"
          />
        </div>

        <Button
          type="submit"
          disabled={!code.trim() || loading}
          className="w-full bg-gold-500 hover:bg-gold-600 text-white py-3 h-auto rounded-xl font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
              جاري التحقق...
            </>
          ) : (
            "تفعيل الكوبون"
          )}
        </Button>
      </form>

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${result.success
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
            }`}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p
            className={`text-sm font-medium ${result.success ? "text-green-700" : "text-red-700"
              }`}
          >
            {result.message}
          </p>
        </div>
      )}

      <p className="text-xs text-beige-400 mt-4 text-center">
        أدخل رمز الكوبون الذي حصلت عليه لإضافة رصيد إلى حسابك
      </p>
    </div>
  );
}
