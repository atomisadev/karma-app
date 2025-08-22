"use client";

import { useEffect, useState, useCallback } from "react";
import { eden } from "@/lib/api";

export function usePlaid() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    eden.api.plaid.createLinkToken
      .post()
      .then(({ data }) => setLinkToken(data?.linkToken || null))
      .catch(() => setLinkToken(null));
  }, []);

  const onLinkSuccess = useCallback((publicToken: string) => {
    setLoading(true);
    eden.api.plaid.exchangePublicToken.post({ publicToken }).then(() =>
      eden.api.plaid.exchangePublicToken
        .post({ publicToken })
        .then(() => eden.api.plaid.transactions.get())
        .then(({ data }) => setTransactions(data?.transactions || []))
        .finally(() => setLoading(false))
    );
  }, []);

  const refreshTransactions = useCallback(() => {
    eden.api.plaid.transactions
      .get()
      .then(({ data }) => setTransactions(data?.transactions || []));
  }, []);

  return {
    linkToken,
    transactions,
    loading,
    onLinkSuccess,
    refreshTransactions,
  };
}
