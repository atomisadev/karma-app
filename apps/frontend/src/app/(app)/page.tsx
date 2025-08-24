"use client";

import { useMemo, useState, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import Score from "../../components/Score";
import { useUserProfile } from "./_hooks/use-user";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useMutation } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function Home() {
  const {
    linkToken,
    transactions,
    loading,
    isConnected,
    checkingStatus,
    transactionsLoading,
    onLinkSuccess,
    refreshTransactions,
    disconnect,
    isDisconnecting,
  } = usePlaid();
  const { getToken } = useAuth();
  const { me, saveBudgets } = useUserProfile();

  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [previousBudgets, setPreviousBudgets] = useState<Record<
    string,
    number
  > | null>(null);

  useEffect(() => {
    if (me?.budgets) {
      setBudgets(me.budgets);
    }
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

  const income30 = useMemo(() => {
    const clearedRecent =
      transactions?.filter(
        (t: any) => t.status === "cleared" && t.date >= last30Days
      ) || [];
    const incomes = clearedRecent.filter(
      (t: any) => t.name === "Monthly Salary Deposit"
    );
    return incomes.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  }, [transactions, last30Days]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    (transactions || [])
      .filter(
        (t: any) =>
          t.status === "cleared" && t.amount > 0 && t.date >= last30Days
      )
      .forEach((t: any) => {
        const top = t.category?.[0] ?? "Other";
        map.set(top, (map.get(top ?? 0) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .reduce<Record<string, number>>((acc, [k, v]) => ((acc[k] = v), acc), {});
  }, [transactions, last30Days]);

  const aiSuggestionMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const { data, error } = await eden.api.openai.insight.post(
        { prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: (data) => {
      if (data && "insight" in data) {
        try {
          const suggestedBudgets = JSON.parse(data.insight);
          setBudgets(suggestedBudgets);
          setHasChanges(true);
          toast.success("AI budget recommendations applied!");
        } catch (e) {
          console.error("Failed to parse AI response:", e);
          toast.error("The AI returned an invalid response. Please try again.");
        }
      } else if (data && "error" in data) {
        console.error("AI suggestion error:", data.error);
        toast.error(`An error occurred: ${data.error}`);
      }
    },
  });

  const handleGetAiSuggestions = () => {
    setPreviousBudgets(budgets);
    const categories = Object.keys(categoryTotals).join(", ");
    const prompt = `My monthly income is ${formatCurrency(
      income30
    )}. My spending categories from the last month are: ${categories}. Please provide a recommended monthly budget for each of these categories as a JSON object, where keys are the category names and values are the budget amounts as numbers. The total budget should be less than my income.`;
    aiSuggestionMutation.mutate(prompt);
  };

  const handleBudgetChange = (category: string, value: string) => {
    setBudgets((prev) => ({
      ...prev,
      [category]: Number(value || 0),
    }));
    setHasChanges(true);
    setPreviousBudgets(null);
  };

  const handleSaveBudgets = () => {
    saveBudgets.mutate(budgets, {
      onSuccess: () => {
        setHasChanges(false);
        setPreviousBudgets(null);
        toast.success("Budgets saved successfully!");
      },
    });
  };

  if (checkingStatus) {
    return (
      <div className="font-sans min-h-screen p-8 flex flex-col items-center gap-8">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row justify-evenly w-full font-sans p-8 gap-8">
      {/* Left Column */}
      <div className="flex flex-col items-center w-full md:w-1/2">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Karma Score</h2>
          <Score score={500} size={400} />
        </div>

        {isConnected && !transactionsLoading && (
          <Card className="w-full max-w-xl mt-8">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-sm text-gray-500">Monthly Income</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(income30)}
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Your Budgets</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGetAiSuggestions}
                      disabled={aiSuggestionMutation.isPending}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center gap-1"
                      title="Get AI budget recommendations"
                    >
                      ✨{" "}
                      {aiSuggestionMutation.isPending ? "Thinking..." : "Ask AI"}
                    </button>
                    <button
                      onClick={handleSaveBudgets}
                      disabled={!hasChanges || saveBudgets.isPending}
                      className="px-3 py-1 text-sm bg-black text-white rounded-md disabled:opacity-50"
                    >
                      {saveBudgets.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {Object.entries(categoryTotals).map(([category, total]) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{category}</span>
                        <input
                          type="number"
                          value={budgets[category] ?? ""}
                          onChange={(e) =>
                            handleBudgetChange(category, e.target.value)
                          }
                          className="w-28 text-right border rounded-md px-2 py-1"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-right flex justify-end items-center gap-3">
                        {previousBudgets &&
                          previousBudgets[category] !== undefined && (
                            <span className="text-gray-400 italic">
                              (was: {formatCurrency(previousBudgets[category])})
                            </span>
                          )}
                        <span>Spent: {formatCurrency(total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column */}
      <div className="w-full md:w-1/2 flex flex-col items-center gap-8">
        <h1 className="text-2xl font-semibold text-center">
          {isConnected
            ? "Your Transactions"
            : "Connect a bank and view transactions"}
        </h1>

        <div className="flex gap-4">
          {!isConnected && (
            <Button
              disabled={!ready || !linkToken || loading}
              onClick={() => open()}
            >
              {loading ? "Loading..." : "Connect bank"}
            </Button>
          )}
          {isConnected && (
            <>
              <Button
                variant="outline"
                onClick={() => refreshTransactions()}
              >
                Refresh transactions
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnect()}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect Account"}
              </Button>
            </>
          )}
        </div>

        {transactionsLoading && (
          <div className="w-full max-w-2xl">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="divide-y rounded-md border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 flex justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        )}

        {isConnected && !transactionsLoading && (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>
                <p>Recent transactions</p>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!transactions?.length ? (
                <p className="text-gray-500 text-center">
                  No transactions found. Try refreshing or check your account.
                </p>
              ) : (
                <ul className="divide-y rounded-md border w-full overflow-scroll overflow-x-hidden h-[58vh]">
                  {transactions.map((tx: any) => {
                    const isPending = tx.status === "pending";
                    const displayAmount = -tx.amount;
                    const amountColor =
                      displayAmount > 0 ? "text-green-600" : "text-red-600";

                    return (
                      <li
                        key={tx.transaction_id}
                        className={cn(
                          "p-3 flex justify-between items-center",
                          isPending && "opacity-60"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {tx.name || "Transaction"}
                          </span>
                          <span className="text-sm text-gray-500">
                            {tx.date} {isPending && "(Pending)"}
                          </span>
                        </div>
                        <span
                          className={cn("font-mono font-semibold", amountColor)}
                        >
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: tx.iso_currency_code || "USD",
                          }).format(displayAmount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}