import {
  PlaidWebhookSchema,
  type PlaidWebhookInput,
} from "@backend/schemas/plaid.schema";
import type { User } from "@backend/schemas/user.schema";
import { getDb } from "@backend/services/mongo.service";
import Elysia from "elysia";
import { z } from "zod";

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

      const user = await users.findOne({ plaidItemId: event.itemId });
      if (!user) {
        return { ok: true, unknownItem: true };
      }

      console.log(`Plaid - ${event.webhookCode} received`);

      switch (event.webhookCode) {
        case "DEFAULT_UPDATE":
        case "INITIAL_UPDATE":
        case "HISTORICAL_UPDATE":
        case "SYNC_UPDATES_AVAILABLE":
          break;
        case "TRANSACTIONS_REMOVED":
          break;
        default:
          break;
      }

      return { ok: true };
    } catch (error) {
      console.error("Plaid webhook error:", error);
      set.status = 500;
      return { ok: false, error: "Internal server error" };
    }
  }
);
