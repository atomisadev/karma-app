import { getFinancialInsight } from "@backend/services/openai.service";
import type { App } from "../app";
import { t } from "elysia";

export const openaiRoutes = (app: App) =>
  app.group("/api/openai", (group) =>
    group.post(
      "/insight",
      async ({ body, requireAuth, set }) => {
        const userId = requireAuth();

        const { prompt } = body;

        try {
          const insight = getFinancialInsight(prompt);
          return insight;
        } catch (error) {
          set.status = 500;
          return { error: (error as Error).message };
        }
      },
      {
        body: t.Object({
          prompt: t.String(),
        }),
      }
    )
  );
