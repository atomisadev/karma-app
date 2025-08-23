"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export type TransactionInput = {
  amount: number;
  datePosted: string;
  dateTransacted: string;
  description: string;
  isoCurrencyCode?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const newRow = (): TransactionInput => ({
  amount: 0,
  datePosted: today(),
  dateTransacted: today(),
  description: "",
  isoCurrencyCode: "USD",
});

export function useAdminTransactions() {
  const [rows, setRows] = useState<TransactionInput[]>([newRow()]);
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const createTransactionsMutation = useMutation({
    mutationFn: async (transactions: TransactionInput[]) => {
      if (!isSignedIn) throw new Error("Please sign in");

      const token = await getToken();
      if (!token) throw new Error("Missing auth token");

      const response = await eden.api.plaid.sandbox.createTransactions.post(
        { transactions },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.ok) {
        throw new Error(
          response.data?.error || "Failed to create transactions"
        );
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
      queryClient.refetchQueries({ queryKey: ["plaid", "transactions"] });
      setRows([newRow()]);
    },
  });

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows([...rows, newRow()]);
  };

  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, patch: Partial<TransactionInput>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = () => {
    createTransactionsMutation.mutate(rows);
  };

  const addPresetTransaction = (
    type: "coffee" | "grocery" | "gas" | "restaurant" | "income"
  ) => {
    const presets = {
      coffee: {
        amount: 4.5, // ✅ Positive for expense
        description: "Coffee Shop",
        isoCurrencyCode: "USD",
      },
      grocery: {
        amount: 75.3, // ✅ Positive for expense
        description: "Grocery Store",
        isoCurrencyCode: "USD",
      },
      gas: {
        amount: 45.0, // ✅ Positive for expense
        description: "Gas Station",
        isoCurrencyCode: "USD",
      },
      restaurant: {
        amount: 28.75, // ✅ Positive for expense
        description: "Restaurant",
        isoCurrencyCode: "USD",
      },
      income: {
        amount: -2500.0, // ✅ Negative for income (credit)
        description: "Salary Deposit",
        isoCurrencyCode: "USD",
      },
    };

    const preset = presets[type];
    setRows([
      ...rows,
      {
        ...newRow(),
        ...preset,
      },
    ]);
  };

  return {
    rows,
    addRow,
    removeRow,
    updateRow,
    submit,
    addPresetTransaction,
    loading: createTransactionsMutation.isPending,
    error: createTransactionsMutation.error?.message || null,
    ok: createTransactionsMutation.isSuccess,
  };
}
