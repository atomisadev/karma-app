import { app as baseApp } from "./app";

import { plaidRoutes } from "./routes/plaid.route";

const app = baseApp
  .get("/", () => ({ message: "Hello from Elysia!" }))
  .use(plaidRoutes)
  .listen(3001);

console.log(
  `Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
