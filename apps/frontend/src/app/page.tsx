"use client";

import { useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import { usePlaid } from "@/app/_hooks/use-plaid";

export default function Home() {
  const {
    linkToken,
    transactions,
    loading,
    onLinkSuccess,
    refreshTransactions,
  } = usePlaid();

  const config = useMemo(() => {
    if (!linkToken) return null;
    return {
      token: linkToken,
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    };
  }, [linkToken, onLinkSuccess]);

  const linkOptions = useMemo(
    () => ({
      token: linkToken ?? "",
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    }),
    [linkToken, onLinkSuccess]
  );

  const { open, ready } = usePlaidLink(linkOptions);

  return (
    <div className="font-sans min-h-screen p-8 flex flex-col items-center gap-8">
      <h1 className="text-2xl font-semibold">
        Connect a bank and view transactions
      </h1>

      <div className="flex gap-4">
        <button
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
          disabled={!ready || !linkToken || loading}
          onClick={() => open()}
        >
          {loading ? "Loading..." : "Connect bank"}
        </button>

        <button
          className="rounded-md border px-4 py-2"
          onClick={() => refreshTransactions()}
        >
          Refresh transactions
        </button>
      </div>

      {!transactions?.length && (
        <p className="text-gray-500">
          No transactions yet. Connect a bank above.
        </p>
      )}

      {!!transactions?.length && (
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-medium mb-2">Recent transactions</h2>
          <ul className="divide-y rounded-md border">
            {transactions.map((tx: any) => (
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
