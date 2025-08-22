"use client";

import { useState } from "react";
import { eden } from "@/lib/api";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

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

  const submit = async () => {
    setError(null);
    setOk(false);
    setLoading(true);
    try {
      const { data } = await eden.api.plaid.sandbox.createTransactions.post({
        transactions: rows,
      });
      if (!data?.ok) {
        setError(data?.error || "Failed to create transactions");
        return;
      }
      setOk(true);
    } finally {
      setLoading(false);
    }
  };

  return { rows, addRow, removeRow, updateRow, submit, loading, error, ok };
}
