import {
  PlaidWebhookSchema,
  type PlaidWebhookInput,
} from "@backend/schemas/plaid.schema";
import type { User } from "@backend/schemas/user.schema";
import { getDb } from "@backend/services/mongo.service";
import Elysia from "elysia";
import { z } from "zod";
import { PlaidApi, Configuration, PlaidEnvironments } from "plaid";
import { type Transaction } from "@backend/schemas/transaction.schema";
import { processNewTransactionForKarma } from "@backend/services/transaction.service";
import { ObjectId } from "mongodb";

const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

export const plaidWebhookRoutes = new Elysia({ prefix: "/webhook" }).post(
  "/plaid",
  async ({ body, set }) => {
    const parsed = PlaidWebhookSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { ok: false, error: "Invalid webhook payload" };
    }

    const event = parsed.data as PlaidWebhookInput;

    if (event.webhookType !== "TRANSACTIONS") {
      return { ok: true, ignored: true };
    }

    try {
      const db = await getDb();
      const users = db.collection<User>("users");
      const transactionsCollection = db.collection<Transaction>("transactions");

      const user = await users.findOne({ plaidItemId: event.itemId });
      if (!user) {
        return { ok: true, unknownItem: true };
      }

      console.log(`Plaid - ${event.webhookCode} received`);

      switch (event.webhookCode) {
        case "DEFAULT_UPDATE":
        case "INITIAL_UPDATE":
        case "HISTORICAL_UPDATE":
        case "SYNC_UPDATES_AVAILABLE": {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          let hasMore = true;
          let cursor = user.plaidTransactionsCursor;

          while (hasMore) {
            const { data } = await plaid.transactionsSync({
              access_token: user.plaidAccessToken!,
              cursor: cursor,
            });

            const upsertOperations = [...data.added, ...data.modified].map(
              (tx) => ({
                updateOne: {
                  filter: { plaidTransactionId: tx.transaction_id },
                  update: {
                    $set: {
                      clerkId: user.clerkId,
                      plaidTransactionId: tx.transaction_id,
                      plaidAccountId: tx.account_id,
                      amount: tx.amount,
                      date: tx.date,
                      name: tx.name,
                      paymentChannel: tx.payment_channel,
                      category: tx.category || undefined,
                      isoCurrencyCode: tx.iso_currency_code,
                      status: tx.pending ? "pending" : "cleared",
                    },
                  },
                  upsert: true,
                },
              })
            );

            if (upsertOperations.length > 0) {
              await transactionsCollection.bulkWrite(upsertOperations as any);
              console.log(`Synced ${upsertOperations.length} transactions.`);

              // Process each added/modified transaction for challenge/karma in near-realtime
              const incoming = [...data.added, ...data.modified];
              for (const tx of incoming) {
                const txDoc: Transaction = {
                  _id: new ObjectId(),
                  clerkId: user.clerkId,
                  plaidTransactionId: tx.transaction_id,
                  plaidAccountId: tx.account_id,
                  amount: tx.amount,
                  date: tx.date,
                  name: tx.name,
                  paymentChannel: tx.payment_channel || "other",
                  category: tx.category || undefined,
                  isoCurrencyCode: tx.iso_currency_code || "USD",
                  status: tx.pending ? "pending" : "cleared",
                } as Transaction;

                await processNewTransactionForKarma(user.clerkId, txDoc);
              }
            }

            if (data.removed.length > 0) {
              const removedIds = data.removed.map((tx) => tx.transaction_id);
              await transactionsCollection.deleteMany({
                plaidTransactionId: { $in: removedIds },
              });
              console.log(`Removed ${data.removed.length} transactions.`);
            }

            hasMore = data.has_more;
            cursor = data.next_cursor;
          }

          await users.updateOne(
            { clerkId: user.clerkId },
            { $set: { plaidTransactionsCursor: cursor } }
          );
          break;
        }
        case "TRANSACTIONS_REMOVED": {
          // No-op
          break;
        }
        default: {
          break;
        }
      }

      return { ok: true };
    } catch (error) {
      console.error("Plaid webhook error:", error);
      set.status = 500;
      return { ok: false, error: "Internal server error" };
    }
  }
);
