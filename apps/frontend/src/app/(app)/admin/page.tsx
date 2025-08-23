"use client";

import { TransactionsForm } from "./_components/transactions-form";
import { useAdminTransactions } from "./_hooks/use-admin-transactions";

export default function AdminPage() {
  const {
    rows,
    addRow,
    removeRow,
    updateRow,
    submit,
    addPresetTransaction,
    loading,
    error,
    ok,
  } = useAdminTransactions();

  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-gray-50">
      <div className="w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Create custom transactions for testing and development
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <TransactionsForm
            rows={rows}
            addRow={addRow}
            removeRow={removeRow}
            updateRow={updateRow}
            submit={submit}
            addPresetTransaction={addPresetTransaction}
            loading={loading}
            error={error}
            ok={ok}
          />
        </div>
      </div>
    </div>
  );
}
