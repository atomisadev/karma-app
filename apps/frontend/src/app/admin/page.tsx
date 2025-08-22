"use client";

import { TransactionsForm } from "./_components/transactions-form";
import { useAdminTransactions } from "./_hooks/use-admin-transactions";

export default function AdminPage() {
  const { rows, addRow, removeRow, updateRow, submit, loading, error, ok } =
    useAdminTransactions();

  return (
    <div className="min-h-screen p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
        <TransactionsForm
          rows={rows}
          addRow={addRow}
          removeRow={removeRow}
          updateRow={updateRow}
          submit={submit}
          loading={loading}
          error={error}
          ok={ok}
        />
      </div>
    </div>
  );
}
