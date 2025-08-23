"use client";

import type { TransactionInput } from "../_hooks/use-admin-transactions";

export function TransactionsForm({
  rows,
  addRow,
  removeRow,
  updateRow,
  submit,
  addPresetTransaction,
  loading,
  error,
  ok,
}: {
  rows: TransactionInput[];
  addRow: () => void;
  removeRow: (i: number) => void;
  updateRow: (i: number, patch: Partial<TransactionInput>) => void;
  submit: () => void;
  addPresetTransaction: (
    type: "coffee" | "grocery" | "gas" | "restaurant" | "income"
  ) => void;
  loading: boolean;
  error: string | null;
  ok: boolean;
}) {
  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create Custom Transactions</h2>
        <div className="flex gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => addRow()}
            disabled={rows.length >= 10}
          >
            Add Empty Row
          </button>
        </div>
      </div>

      {/* Preset Transaction Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Quick Add Presets:
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-amber-100 text-amber-800 px-3 py-1 text-sm hover:bg-amber-200"
            onClick={() => addPresetTransaction("coffee")}
            disabled={rows.length >= 10}
          >
            ☕ Coffee (-$4.50)
          </button>
          <button
            className="rounded-md bg-green-100 text-green-800 px-3 py-1 text-sm hover:bg-green-200"
            onClick={() => addPresetTransaction("grocery")}
            disabled={rows.length >= 10}
          >
            🛒 Grocery (-$75.30)
          </button>
          <button
            className="rounded-md bg-blue-100 text-blue-800 px-3 py-1 text-sm hover:bg-blue-200"
            onClick={() => addPresetTransaction("gas")}
            disabled={rows.length >= 10}
          >
            ⛽ Gas (-$45.00)
          </button>
          <button
            className="rounded-md bg-purple-100 text-purple-800 px-3 py-1 text-sm hover:bg-purple-200"
            onClick={() => addPresetTransaction("restaurant")}
            disabled={rows.length >= 10}
          >
            🍽️ Restaurant (-$28.75)
          </button>
          <button
            className="rounded-md bg-emerald-100 text-emerald-800 px-3 py-1 text-sm hover:bg-emerald-200"
            onClick={() => addPresetTransaction("income")}
            disabled={rows.length >= 10}
          >
            💰 Salary (+$2500.00)
          </button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Date Posted</th>
              <th className="text-left p-3">Date Transacted</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Currency</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <input
                    className="w-32 rounded border px-2 py-1 text-right"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={Number.isFinite(r.amount) ? r.amount : ""}
                    onChange={(e) =>
                      updateRow(i, {
                        amount: parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="date"
                    value={r.datePosted}
                    onChange={(e) =>
                      updateRow(i, { datePosted: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="date"
                    value={r.dateTransacted}
                    onChange={(e) =>
                      updateRow(i, { dateTransacted: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-64 rounded border px-2 py-1"
                    placeholder="Transaction description..."
                    value={r.description}
                    onChange={(e) =>
                      updateRow(i, { description: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-20 rounded border px-2 py-1"
                    placeholder="USD"
                    value={r.isoCurrencyCode || ""}
                    onChange={(e) =>
                      updateRow(i, { isoCurrencyCode: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <button
                    className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <div className="text-sm text-red-600">❌ {error}</div>
        </div>
      )}

      {ok && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <div className="text-sm text-green-600">
            ✅ Transactions created successfully! Check the main page to see
            them.
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-md bg-black text-white px-6 py-2 disabled:opacity-50"
          onClick={() => submit()}
          disabled={
            loading ||
            rows.length === 0 ||
            rows.every((r) => !r.description.trim())
          }
        >
          {loading
            ? "Creating..."
            : `Create ${rows.length} Transaction${rows.length !== 1 ? "s" : ""}`}
        </button>

        <button
          className="rounded-md border px-4 py-2 text-gray-600"
          onClick={() => (window.location.href = "/")}
        >
          ← Back to Transactions
        </button>
      </div>
    </div>
  );
}
