"use client";

import { useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { Skeleton } from "@/components/ui/skeleton";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import Score from "../../components/Score";

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
    <div className="flex flex-row justify-evenly w-full font-sans">
      <div className="flex flex-col items-center my-40">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Karma Score</h2>
          <Score score={500} size={400}/>
        </div>
      </div>
    <div className=" min-h-screen p-8 flex flex-col items-center gap-8">
      <h1 className="text-2xl font-semibold">
        {isConnected
          ? "Your Transactions"
          : "Connect a bank and view transactions"}
      </h1>

      <div className="flex gap-4">
        {!isConnected && (
          <button
            className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
            disabled={!ready || !linkToken || loading}
            onClick={() => open()}
          >
            {loading ? "Loading..." : "Connect bank"}
          </button>
        )}
        {isConnected && (
          <>
            <button
              className="rounded-md border px-4 py-2"
              onClick={() => refreshTransactions()}
            >
              Refresh transactions
            </button>
            <button
              className="rounded-md border border-red-500/50 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
            > 
              {isDisconnecting ? "Disconnecting..." : "Disconnect Account"}
            </button>
          </>
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
                  <span className={cn("font-mono font-semibold", amountColor)}>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: tx.iso_currency_code || "USD",
                    }).format(displayAmount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
    </div>
  );
}
