"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { useUserProfile } from "@/app/(app)/_hooks/use-user";
import { useAuth } from "@clerk/nextjs";
import { usePlaidLink } from "react-plaid-link";

type Tx = {
  amount: number;
  date: string;
  name: string;
  category?: string[];
  status: "pending" | "cleared";
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    linkToken,
    onLinkSuccess,
    transactions,
    checkingStatus,
    isConnected,
    transactionsLoading,
  } = usePlaid();
  const { me, loading, completeOnboarding } = useUserProfile();

  const [budgets, setBudgets] = useState<Record<string, number>>({});

  useEffect(() => {
    if (me?.onboardingCompleted) {
      router.replace("/");
    }
  }, [me?.onboardingCompleted, router]);

  useEffect(() => {
    if (me?.budgets) setBudgets(me.budgets);
  }, [me?.budgets]);

  const linkOptions = useMemo(
    () => ({
      token: linkToken ?? "",
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    }),
    [linkToken, onLinkSuccess]
  );
  const { open, ready } = usePlaidLink(linkOptions);

  const last30Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const txs = (transactions ?? []) as Tx[];

  const income30 = useMemo(() => {
    const clearedRecent = txs.filter(
      (t) => t.status === "cleared" && t.date >= last30Days
    );
    const incomes = clearedRecent.filter(
      (t) =>
        t.amount < 0 ||
        t.category?.includes("Payroll") ||
        t.category?.includes("Deposit")
    );
    return incomes.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [txs, last30Days]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    txs
      .filter((t) => t.status === "cleared" && t.amount > 0)
      .forEach((t) => {
        const top = t.category?.[0] ?? "Other";
        map.set(top, (map.get(top) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .reduce<Record<string, number>>((acc, [k, v]) => ((acc[k] = v), acc), {});
  }, [txs]);

  const mergedBudgets = useMemo(() => {
    const b = { ...budgets };
    Object.keys(categoryTotals).forEach((k) => {
      if (b[k] == null) b[k] = Math.round(categoryTotals[k]);
    });
    return b;
  }, [budgets, categoryTotals]);

  const [saving, setSaving] = useState(false);
  const handleComplete = async () => {
    try {
      setSaving(true);
      await completeOnboarding.mutateAsync(mergedBudgets);
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div className="font-sans min-h-screen p-8 max-w-3xl mx-auto flex flex-col gap-8">
      <div className="rounded-xl border p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Welcome!</h1>
        {checkingStatus || transactionsLoading ? (
          <p>Loading your data…</p>
        ) : !isConnected ? (
          <div className="flex items-center gap-3">
            <button
              disabled={!ready}
              onClick={() => open()}
              className="px-4 py-2 bg-black text-white rounded"
            >
              Connect your bank
            </button>
            <p className="text-sm text-gray-600">
              Connect to pull your transactions, then we’ll show your summary.
            </p>
          </div>
        ) : (
          <>
            <p className="text-lg">
              You make <span className="font-bold">${income30.toFixed(2)}</span>{" "}
              over the last 30 days.
            </p>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="self-start px-4 py-2 bg-black text-white rounded"
            >
              {saving ? "Saving…" : "I understand"}
            </button>
          </>
        )}
      </div>

      {Object.keys(categoryTotals).length > 0 && (
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">
            Your spending by category
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(categoryTotals).map(([cat, total]) => (
              <div
                key={cat}
                className="flex items-center justify-between gap-3 border rounded p-3"
              >
                <div className="flex-1">
                  <div className="font-medium">{cat}</div>
                  <div className="text-sm text-gray-600">
                    Last 30 days: ${total.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Budget</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-32"
                    value={mergedBudgets[cat] ?? 0}
                    onChange={(e) =>
                      setBudgets((prev) => ({
                        ...prev,
                        [cat]: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              disabled={saving}
              onClick={handleComplete}
              className="px-4 py-2 bg-black text-white rounded"
            >
              {saving ? "Saving…" : "Save budgets and finish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
