"use client";

import { useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { Skeleton } from "@/components/ui/skeleton";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

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
  } = usePlaid();
  const { getToken } = useAuth();

  const linkOptions = useMemo(
    () => ({
      token: linkToken ?? "",
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    }),
    [linkToken, onLinkSuccess]
  );

  const { open, ready } = usePlaidLink(linkOptions);

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
    <div className="font-sans min-h-screen p-8 flex flex-col items-center gap-8">
      <h1 className="text-2xl font-semibold">
        {isConnected
          ? "Your Transactions"
          : "Connect a bank and view transactions"}
      </h1>

      <div className="flex gap-4">
        {!isConnected && (
          <button
            className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            disabled={!ready || !linkToken || loading}
            onClick={() => open()}
          >
            {loading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span>{loading ? "Loading..." : "Connect bank"}</span>
          </button>
        )}
        {isConnected && (
          <button
            className="rounded-md border px-4 py-2 inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => refreshTransactions()}
            disabled={transactionsLoading}
          >
            {transactionsLoading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span>Refresh transactions</span>
          </button>
        )}
        {isConnected && (
          <button
            className="rounded-md bg-red-600 text-white px-4 py-2 text-sm cursor-pointer"
            onClick={async () => {
              const token = await getToken();
              if (!token) return;

              // Check accounts first
              const accounts = await eden.api.plaid.accounts.get({
                headers: { Authorization: `Bearer ${token}` },
              });
              console.log("Accounts:", accounts);

              // Then check transactions with explicit date range
              const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10);

              const transactionsWithDates =
                await eden.api.plaid.transactions.get({
                  query: { startDate: "2023-01-01", endDate: futureDate },
                  headers: { Authorization: `Bearer ${token}` },
                });
              console.log(
                "Transactions with wide date range:",
                transactionsWithDates
              );
            }}
          >
            🐛 Debug Plaid
          </button>
        )}
      </div>

      {isConnected && !transactions?.length && !transactionsLoading && (
        <p className="text-gray-500">
          No transactions found. Try refreshing or check your account.
        </p>
      )}

      {!isConnected && !transactions?.length && (
        <p className="text-gray-500">
          Connect your bank account to view transactions.
        </p>
      )}

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

      {!!transactions?.length && !transactionsLoading && (
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-medium mb-2">Recent transactions</h2>
          <ul className="divide-y rounded-md border">
            {transactions.map((tx: {
              transaction_id: string;
              name?: string | null;
              merchant_name?: string | null;
              date?: string;
              amount?: number;
            }) => (
              <li key={tx.transaction_id} className="p-3 flex justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {tx.name || tx.merchant_name || "Transaction"}
                  </span>
                  <span className="text-sm text-gray-500">{tx.date}</span>
                </div>
                <span className="font-mono">
                  {typeof tx.amount === "number"
                    ? `$${tx.amount.toFixed(2)}`
                    : "--"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
