import { Elysia, error } from "elysia";
import { clerkPlugin } from "elysia-clerk";

export const clerkAuth = new Elysia()
  .use(clerkPlugin())
  .onBeforeHandle((ctx) => {
    const auth = ctx.auth();
    if (!auth?.userId) return error(401);
  });
