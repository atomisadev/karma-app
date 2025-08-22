// apps/frontend/src/app/admin/_components/transactions-form.tsx
"use client";

import type { TransactionInput } from "../_hooks/use-admin-transactions";

export function TransactionsForm({
  rows,
  addRow,
  removeRow,
  updateRow,
  submit,
  loading,
  error,
  ok,
}: {
  rows: TransactionInput[];
  addRow: () => void;
  removeRow: (i: number) => void;
  updateRow: (i: number, patch: Partial<TransactionInput>) => void;
  submit: () => void;
  loading: boolean;
  error: string | null;
  ok: boolean;
}) {
  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create sandbox transactions</h2>
        <button
          className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => addRow()}
          disabled={rows.length >= 10}
        >
          Add row
        </button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Amount</th>
              <th className="text-left p-2">Date Posted</th>
              <th className="text-left p-2">Date Transacted</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2">Currency</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  <input
                    className="w-28 rounded border px-2 py-1"
                    type="number"
                    step="0.01"
                    value={Number.isFinite(r.amount) ? r.amount : 0}
                    onChange={(e) =>
                      updateRow(i, {
                        amount: parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="date"
                    value={r.datePosted}
                    onChange={(e) =>
                      updateRow(i, { datePosted: e.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="date"
                    value={r.dateTransacted}
                    onChange={(e) =>
                      updateRow(i, { dateTransacted: e.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-64 rounded border px-2 py-1"
                    placeholder="Description"
                    value={r.description}
                    onChange={(e) =>
                      updateRow(i, { description: e.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-24 rounded border px-2 py-1"
                    placeholder="USD"
                    value={r.isoCurrencyCode || ""}
                    onChange={(e) =>
                      updateRow(i, { isoCurrencyCode: e.target.value })
                    }
                  />
                </td>
                <td className="p-2">
                  <button
                    className="rounded-md border px-2 py-1 text-xs text-red-600"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {ok && <div className="text-sm text-green-600">Transactions created</div>}

      <button
        className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
        onClick={() => submit()}
        disabled={loading || rows.length === 0}
      >
        {loading ? "Creating..." : "Create transactions"}
      </button>
    </div>
  );
}
