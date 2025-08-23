"use client";

import { useEffect, useState, useCallback } from "react";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export function usePlaid() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    getToken().then((token) => {
      if (!token) return;
      eden.api.plaid.createLinkToken
        .post(undefined, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setLinkToken(data?.linkToken || null))
        .catch(() => setLinkToken(null));
    });
  }, [isSignedIn, getToken]);

  const onLinkSuccess = useCallback(
    (publicToken: string) => {
      setLoading(true);
      getToken().then((token) => {
        if (!token) {
          setLoading(false);
          return;
        }
        eden.api.plaid.exchangePublicToken
          .post(
            { publicToken },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then(() =>
            eden.api.plaid.transactions.get({
              headers: { Authorization: `Bearer ${token}` },
            })
          )
          .then(({ data }) => setTransactions(data?.transactions || []))
          .finally(() => setLoading(false));
      });
    },
    [getToken]
  );

  const refreshTransactions = useCallback(() => {
    getToken().then((token) => {
      if (!token) return;
      eden.api.plaid.transactions
        .get({ headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setTransactions(data?.transactions || []));
    });
  }, [getToken]);

  return {
    linkToken,
    transactions,
    loading,
    onLinkSuccess,
    refreshTransactions,
  };
}
