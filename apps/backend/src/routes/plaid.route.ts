import { Elysia } from "elysia";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getTransactions,
  getUserPlaidStatus,
} from "../services/plaid.service";
import {
  ExchangePublicTokenSchema,
  SandboxCreateTransactionsSchema,
  TransactionsQuerySchema,
} from "../schemas/plaid.schema";
import type { App } from "../app";
import { getDb } from "@backend/services/mongo.service";
import { type Transaction } from "@backend/schemas/transaction.schema";

export const plaidRoutes = (app: App) =>
  app.group("/api/plaid", (group) =>
    group
      .post("/createLinkToken", async ({ requireAuth }) => {
        const userId = requireAuth();
        const res = await createLinkToken({ userId: userId });
        return res;
      })
      .post("/exchangePublicToken", async ({ body, set, requireAuth }) => {
        const userId = requireAuth();
        const parsed = ExchangePublicTokenSchema.safeParse(body);
        if (!parsed.success) {
          set.status = 400;
          return { error: "Invalid body" };
        }
        const res = await exchangePublicToken({
          userId: userId,
          publicToken: parsed.data.publicToken,
        });
        return res;
      })
      .get("/transactions", async ({ query, set, requireAuth }) => {
        const userId = requireAuth();
        const parsed = TransactionsQuerySchema.safeParse(query);
        if (!parsed.success) {
          set.status = 400;
          return { transactions: [], error: "Invalid query" };
        }
        const res = await getTransactions({
          userId: userId,
          ...parsed.data,
        });
        if ("error" in res) {
          set.status = 400;
          return { transactions: [], error: res.error };
        }
        return { transactions: res.transactions };
      })
      .post(
        "/sandbox/createTransactions",
        async ({ body, set, requireAuth }) => {
          const userId = requireAuth();
          const parsed = SandboxCreateTransactionsSchema.safeParse(body);
          if (!parsed.success) {
            set.status = 400;
            return { ok: false, error: "Invalid body" };
          }

          const { transactions } = parsed.data;

          try {
            const db = getDb();
            const transactionsCollection =
              db.collection<Transaction>("transactions");

            const documents = transactions.map((t) => ({
              clerkId: userId,
              plaidTransactionId: `manual-tx-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 9)}`,
              plaidAccountId: "manual-account",
              amount: t.amount,
              date: t.datePosted,
              name: t.description,
              paymentChannel: "manual",
              category: ["Manual", "Custom"],
              isoCurrencyCode: t.isoCurrencyCode || "USD",
              pending: false,
            }));

            await transactionsCollection.insertMany(documents as any);
            console.log(
              `Successfully created ${documents.length} manual transactions.`
            );

            return { ok: true };
          } catch (error) {
            console.error("Error creating manual transactions:", error);
            set.status = 500;
            return { ok: false, error: "Internal server error" };
          }
        }
      )
      .get("/status", async ({ requireAuth }) => {
        const userId = requireAuth();
        const status = await getUserPlaidStatus({ userId });
        return status;
      })
      .get("/accounts", async ({ requireAuth }) => {
        const userId = requireAuth();
        const result = await getAccounts({ userId });
        return result;
      })
  );
