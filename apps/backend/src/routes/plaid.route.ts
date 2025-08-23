import { Elysia } from "elysia";
import {
  createLinkToken,
  exchangePublicToken,
  getTransactions,
  sandboxCreateTransactions,
} from "../services/plaid.service";
import {
  ExchangePublicTokenSchema,
  SandboxCreateTransactionsSchema,
  TransactionsQuerySchema,
} from "../schemas/plaid.schema";
import type { App } from "../app";

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

          const res = await sandboxCreateTransactions({
            userId: userId,
            transactions: parsed.data.transactions,
          });
          if ("error" in res) {
            set.status = 400;
            return { ok: false, error: res.error };
          }

          return { ok: true };
        }
      )
  );
