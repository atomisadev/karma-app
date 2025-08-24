import { z } from "zod";

const envSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).optional(),
  BACKEND_PUBLIC_URL: z.string().url().optional(),
  COHERE_API_KEY: z.string().min(1),
  COHERE_MODEL_ID: z.string().min(1),
});

export const env = envSchema.parse({
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
  PLAID_SECRET: process.env.PLAID_SECRET,
  PLAID_ENV: process.env.PLAID_ENV,
  BACKEND_PUBLIC_URL: process.env.BACKEND_PUBLIC_URL,
  COHERE_API_KEY: process.env.COHERE_API_KEY,
  COHERE_MODEL_ID: process.env.COHERE_MODEL_ID,
});
