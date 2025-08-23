import { app as baseApp } from "./app";

import { plaidRoutes } from "./routes/plaid.route";
import { webhookRoutes } from "./routes/webhook.route";

const app = baseApp
  .get("/", () => ({ message: "Hello from Elysia!" }))
  .use(plaidRoutes)
  .use(webhookRoutes)
  .listen(3001);

console.log(
  `Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
