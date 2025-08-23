"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export function usePlaid() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: statusData,
    isLoading: checkingStatus,
    error: statusError,
  } = useQuery({
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

  const fireWebhookMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      return eden.api.plaid.sandbox.fireWebhook.post(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      console.log("Sandbox webhook fired. Fetching transactions in 2.5s...");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
      }, 2500);
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["plaid", "status"] });
      fireWebhookMutation.mutate();
    },
  });

  const onLinkSuccess = useCallback(
    (publicToken: string) => {
      exchangeTokenMutation.mutate(publicToken);
    },
    [exchangeTokenMutation]
  );

  const refreshTransactions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
    refetchTransactions();
  }, [refetchTransactions, queryClient]);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      return eden.api.plaid.disconnect.post(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaid"] });
    },
  });

  return {
    linkToken: linkTokenData?.linkToken || null,
    transactions: transactionsData?.transactions || [],
    loading: exchangeTokenMutation.isPending,
    isConnected,
    checkingStatus: checkingStatus || linkTokenLoading,
    transactionsLoading,
    onLinkSuccess,
    refreshTransactions,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
