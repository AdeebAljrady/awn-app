"use client";

import { useEffect, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { getUserCredits } from "@/app/actions/db/credits";
import Link from "next/link";

export default function CreditDisplay() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCredits = async () => {
      try {
        const { data } = await getUserCredits();
        setBalance(data?.balance ?? 0);
      } catch (error) {
        console.error("Failed to load credits:", error);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    };

    loadCredits();
  }, []);

  return (
    <Link
      href="/credits"
      className="flex items-center gap-2 px-3 py-1.5 bg-gold-50 hover:bg-gold-100 rounded-full transition-colors border border-gold-200"
      title="رصيدك"
    >
      <Coins className="w-4 h-4 text-gold-600" />
      {loading ? (
        <Loader2 className="w-4 h-4 text-gold-600 animate-spin" />
      ) : (
        <span className="text-sm font-bold text-gold-700">{balance}</span>
      )}
    </Link>
  );
}
