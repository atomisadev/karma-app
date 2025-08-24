import { Elysia } from "elysia";
import { z } from "zod";
import type { App } from "../app";
import { getDb } from "../services/mongo.service";
import type { User } from "../schemas/user.schema";
import { replaceWithSeedTransactions } from "../services/transaction.service";
import { disconnectPlaidItem } from "../services/plaid.service";
import { request } from "http";

const BudgetsSchema = z.record(z.string(), z.number());

export const userRoutes = (app: App) =>
  app.group("/api/user", (group) =>
    group
      .get("/me", async ({ requireAuth, set }) => {
        const userId = requireAuth();
        const db = getDb();
        const users = db.collection<User>("users");
        const user = await users.findOne(
          { clerkId: userId },
          { projection: { _id: 0 } }
        );
        if (!user) {
          set.status = 404;
          return { error: "User not found" };
        }
        return {
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          onboardingCompleted: user.onboardingCompleted ?? false,
          budgets: user.budgets ?? {},
          karmaScore: user.karmaScore ?? 500,
          activeChallenge: user.activeChallenge ?? null,
        };
      })
      .patch("/budgets", async ({ body, set, requireAuth }) => {
        const userId = requireAuth();
        const parsed = z.object({ budgets: BudgetsSchema }).safeParse(body);
        if (!parsed.success) {
          set.status = 400;
          return { ok: false, error: "Invalid body" };
        }
        const db = getDb();
        const users = db.collection<User>("users");
        await users.updateOne(
          { clerkId: userId },
          {
            $set: {
              budgets: parsed.data.budgets,
              updatedAt: new Date(),
            },
          }
        );
        return { ok: true };
      })
      .post("/onboarding/complete", async ({ request, set, requireAuth }) => {
        const userId = requireAuth();

        let body: unknown = {};
        try {
          if (request.body) {
            body = await request.json();
          }
        } catch (error) {
          // no need for logging parsing errors for empty body is not necessary
        }

        const parsed = z
          .object({ budgets: BudgetsSchema.optional() })
          .safeParse(body ?? {});
        if (!parsed.success) {
          set.status = 400;
          return { ok: false, error: "Invalid body" };
        }
        const db = getDb();
        const users = db.collection<User>("users");
        const $set: Partial<User> = {
          onboardingCompleted: true,
          updatedAt: new Date(),
        };
        if (parsed.data.budgets) {
          $set.budgets = parsed.data.budgets;
        }
        await users.updateOne({ clerkId: userId }, { $set });
        return { ok: true };
      })
      .post("/useSeedTransactions", async ({ requireAuth, set }) => {
        try {
          const userId = requireAuth();
          await disconnectPlaidItem({ userId });
          const res = await replaceWithSeedTransactions(userId);
          return res;
        } catch (err) {
          console.error("Error switching to seeded transactions:", err);
          set.status = 500;
          return { ok: false, error: "Internal server error" };
        }
      })
  );
