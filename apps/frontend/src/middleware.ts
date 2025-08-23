import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(
  (auth, req) => {
    if (isPublicRoute(req)) return;
    auth.protect();
  },
  {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }
);

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/"],
};
