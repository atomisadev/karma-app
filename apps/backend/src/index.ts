import { Elysia } from "elysia";

const app = new Elysia()
  .get("/", () => "Hello from ElysiaJS!")
  .get("/api/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .listen(3001);

console.log(`🦊 ElysiaJS server running at http://localhost:3001`);
