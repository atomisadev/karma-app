import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { clerkPlugin } from "elysia-clerk";
import type { ElysiaErrors } from "elysia/error";
import { plaidRoutes } from "./routes/plaid.route";
import { clerkWebhookRoutes } from "./routes/clerk-webhook.route";
import { env } from "./config";
import { plaidWebhookRoutes } from "./routes/plaid-webhook.route";

export const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "authorization",
        "content-type",
        "accept",
        "origin",
        "x-requested-with",
        "svix-id",
        "svix-timestamp",
        "svix-signature",
      ],
      exposeHeaders: ["authorization", "content-type", "accept", "origin"],
    })
  )
  .use(clerkPlugin())
  .use(clerkWebhookRoutes)
  .use(plaidWebhookRoutes)
  .derive((ctx) => ({
    requireAuth: () => {
      const { userId } = ctx.auth();
      if (!userId) {
        ctx.set.status = 401;
        throw new Error("Unauthorized");
      }
      return userId;
    },
  }))
  .onError(({ code, error, request, set }) => {
    console.error(
      `[${request.method}] ${request.url} -> ${code}`,
      (error as ElysiaErrors).stack || error
    );
    set.status = typeof code === "number" ? code : 500;
    return { error: "Internal server error" };
  });

export type App = typeof app;
