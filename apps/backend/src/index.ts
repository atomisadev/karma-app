import { app as baseApp } from "./app";

import { plaidRoutes } from "./routes/plaid.route";
import { clerkWebhookRoutes } from "./routes/clerk-webhook.route";
import { connectToDb } from "./services/mongo.service";
import { plaidWebhookRoutes } from "./routes/plaid-webhook.route";
import { userRoutes } from "./routes/user.route";
import { openaiRoutes } from "./routes/openai.route";

await connectToDb();

const app = baseApp
  .get("/", () => ({ message: "Hello from Elysia!" }))
  .use(plaidRoutes)
  .use(userRoutes)
  .use(openaiRoutes)
  .listen({ port: 3001, hostname: "0.0.0.0" });

console.log(
  `Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
