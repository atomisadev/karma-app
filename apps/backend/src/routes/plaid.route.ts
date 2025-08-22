import { Elysia } from "elysia";
import {
  createLinkToken,
  exchangePublicToken,
  getTransactions,
} from "../services/plaid.service";
import {
  ExchangePublicTokenSchema,
  TransactionsQuerySchema,
} from "../schemas/plaid.schema";

const demoUserId = "demo-user";

export const plaidRoutes = new Elysia({ prefix: "/api/plaid" })
  .post("/createLinkToken", async () => {
    const res = await createLinkToken({ userId: demoUserId });
    return res;
  })
  .post("/exchangePublicToken", async ({ body, set }) => {
    const parsed = ExchangePublicTokenSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { error: "Invalid body" };
    }
    const res = await exchangePublicToken({
      userId: demoUserId,
      publicToken: parsed.data.publicToken,
    });
    return res;
  })
  .get("/transactions", async ({ query, set }) => {
    const parsed = TransactionsQuerySchema.safeParse(query);
    if (!parsed.success) {
      set.status = 400;
      return { transactions: [], error: "Invalid query" };
    }
    const res = await getTransactions({ userId: demoUserId, ...parsed.data });
    if ("error" in res) {
      set.status = 400;
      return { transactions: [], error: res.error };
    }
    return { transactions: res.transactions };
  });
