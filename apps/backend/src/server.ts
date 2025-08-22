import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { plaidRoutes } from "./routes/plaid.route";

export const app = new Elysia()
  .use(cors())
  .get("/", () => "Hello from ElysiaJS!")
  .get("/api/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(plaidRoutes);

export type App = typeof app;
