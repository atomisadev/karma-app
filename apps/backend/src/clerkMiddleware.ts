import Elysia from "elysia";
import { clerkPlugin } from "elysia-clerk";

const authMiddleware = (app: Elysia) =>
    app.use(clerkPlugin()).get("/private", async (ctx) => {
        const auth = ctx.auth();
        if (!auth?.userId) {
            return ctx.status(403, "Unauthorized");
        }

        const user = await ctx.clerk.users.getUser(auth.userId);

        return { user };
    });
export { authMiddleware }