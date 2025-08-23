"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export function usePlaid() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // Query for Plaid status
  const { data: statusData, isLoading: checkingStatus } = useQuery({
    queryKey: ["plaid", "status"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await eden.api.plaid.status.get({
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isSignedIn,
  });

  const isConnected = statusData?.isConnected || false;

  // Query for link token (only when not connected)
  const { data: linkTokenData, isLoading: linkTokenLoading } = useQuery({
    queryKey: ["plaid", "linkToken"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await eden.api.plaid.createLinkToken.post(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isSignedIn && !isConnected && !checkingStatus,
  });

  // Query for transactions (only when connected)
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["plaid", "transactions"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await eden.api.plaid.transactions.get({
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isSignedIn && isConnected,
  });

  // Mutation for exchanging public token
  const exchangeTokenMutation = useMutation({
    mutationFn: async (publicToken: string) => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      return eden.api.plaid.exchangePublicToken.post(
        { publicToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch status and transactions
      queryClient.invalidateQueries({ queryKey: ["plaid", "status"] });
      queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
    },
  });

  const onLinkSuccess = useCallback(
    (publicToken: string) => {
      exchangeTokenMutation.mutate(publicToken);
    },
    [exchangeTokenMutation]
  );

  const refreshTransactions = useCallback(() => {
    refetchTransactions();
  }, [refetchTransactions]);

  return {
    linkToken: linkTokenData?.linkToken || null,
    transactions: transactionsData?.transactions || [],
    loading: exchangeTokenMutation.isPending,
    isConnected,
    checkingStatus: checkingStatus || linkTokenLoading,
    transactionsLoading,
    onLinkSuccess,
    refreshTransactions,
  };
}
