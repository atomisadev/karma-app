"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { useUserProfile } from "@/app/(app)/_hooks/use-user";
import { useAuth } from "@clerk/nextjs";
import { usePlaidLink } from "react-plaid-link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
      <div className="min-h-screen p-8 max-w-3xl mx-auto flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Loading your data...</CardTitle>
            <CardDescription>
              Please wait while we fetch your transactions.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen p-8 max-w-3xl mx-auto flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle><h1 className="text-2xl font-semibold text-center">Welcome!</h1></CardTitle>
            <CardDescription>
              Connect your bank account to start your financial journey with Karma.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button disabled={!ready} onClick={() => open()}>
              Connect your bank
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <Dialog open={showIncomeModal} onOpenChange={setShowIncomeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Monthly Income</DialogTitle>
            <DialogDescription>
              This is the estimated total income from your transactions over the last 30 days.
            </DialogDescription>
          </DialogHeader>
          <p className="text-4xl font-bold text-center my-4">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(income30)}
          </p>
          <Button className="w-full" onClick={() => setShowIncomeModal(false)}>
            Yes, I understand
          </Button>
        </DialogContent>
      </Dialog>

      {!showIncomeModal && Object.keys(categoryTotals).length > 0 && (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Set your budgets based on spending</CardTitle>
            <CardDescription>
              We’ve detected your spending categories from the last 30 days. You can set a monthly budget for each, or leave them as the default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-3">
                {Object.entries(categoryTotals).map(([cat, total]) => (
                  <div
                    key={cat}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border rounded-md p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-lg">{cat}</div>
                      <div className="text-sm text-muted-foreground">
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
                      <label className="text-sm">Budget</label>
                      <Input
                        type="number"
                        className="w-28 text-right"
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
            </ScrollArea>
            <Button
              className="w-full mt-4"
              disabled={saving}
              onClick={handleComplete}
            >
              {saving ? "Saving…" : "Save budgets and finish"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
