import { getFinancialInsight } from "@backend/services/cohere.service";
import type { App } from "../app";

export const cohereRoutes = (app: App) =>
  app.group("/api/cohere", (group) =>
    group.post(
      "/insight",
      async ({ request, requireAuth, set }) => {
        const userId = requireAuth();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          set.status = 400;
          return { error: "Invalid body" };
        }

        const prompt = (body as any)?.prompt;
        if (typeof prompt !== "string" || prompt.length === 0) {
          set.status = 400;
          return { error: "Invalid body" };
        }

        try {
          const insight = await getFinancialInsight(prompt);
          return insight;
        } catch (error) {
          set.status = 500;
          return { error: (error as Error).message };
        }
      },
      { type: "none" }
    )
  );
