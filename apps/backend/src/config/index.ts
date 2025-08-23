import { z } from "zod";

const envSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).optional(),
});

export const env = envSchema.parse({
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
  PLAID_SECRET: process.env.PLAID_SECRET,
  PLAID_ENV: process.env.PLAID_ENV,
});
