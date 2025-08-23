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
  const [showIncomeModal, setShowIncomeModal] = useState(true);

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
      (t) => t.name === "Monthly Salary Deposit"
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

  const isLoading = checkingStatus || transactionsLoading || loading;

  if (isLoading) {
    return (
      <div className="font-sans min-h-screen p-8 max-w-3xl mx-auto flex flex-col gap-8 items-center justify-center">
        <div className="rounded-xl border p-6 flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold">Loading your data...</h1>
          <p className="text-gray-600">
            Please wait while we fetch your transactions.
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="font-sans min-h-screen p-8 max-w-3xl mx-auto flex flex-col gap-8 items-center justify-center">
        <div className="rounded-xl border p-6 flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold mb-2">Welcome!</h1>
          <p className="text-gray-600">
            Connect your bank account to start your financial journey with
            Karma.
          </p>
          <div className="flex justify-center items-center mt-4">
            <button
              disabled={!ready}
              onClick={() => open()}
              className="px-4 py-2 bg-black text-white rounded"
            >
              Connect your bank
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => {}}
      >
        {showIncomeModal && (
          <div
            className="relative rounded-xl border bg-white p-8 w-full max-w-sm flex flex-col gap-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="text-2xl font-semibold">Your Monthly Income</h1>
            <p className="text-4xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(income30)}
            </p>
            <p className="text-sm text-gray-600">
              This is the estimated total income from your transactions over the
              last 30 days.
            </p>
            <button
              onClick={() => setShowIncomeModal(false)}
              className="px-4 py-2 bg-black text-white rounded-md mt-4"
            >
              Yes, I understand
            </button>
          </div>
        )}

        {!showIncomeModal && Object.keys(categoryTotals).length > 0 && (
          <div
            className="relative rounded-xl border bg-white p-8 w-full max-w-xl flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">
              Set your budgets based on spending
            </h2>
            <p className="text-sm text-gray-600">
              We’ve detected your spending categories from the last 30 days. You
              can set a monthly budget for each, or leave them as the default.
            </p>
            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2">
              {Object.entries(categoryTotals).map(([cat, total]) => (
                <div
                  key={cat}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border rounded-md p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-lg">{cat}</div>
                    <div className="text-sm text-gray-600">
                      Last 30 days:{" "}
                      <span className="font-bold">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(total)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Budget</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-28"
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
            <button
              disabled={saving}
              onClick={handleComplete}
              className="px-4 py-2 bg-black text-white rounded-md mt-4"
            >
              {saving ? "Saving…" : "Save budgets and finish"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
