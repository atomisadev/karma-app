import { z } from "zod";

export const userSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  imageUrl: z.string().optional(),
  plaidAccessToken: z.string().optional(),
  plaidItemId: z.string().optional(),
  plaidConnectedAt: z.date().optional(),
  plaidTransactionsCursor: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),

  onboardingCompleted: z.boolean().default(false),

  budgets: z.record(z.string(), z.number()).default({}),

  seededTransactionsAt: z.date().optional(),
});

export type User = z.infer<typeof userSchema>;

export const clerkBaseEventSchema = z.object({
  type: z.string(),
  data: z.unknown(),
});

export const clerkUserEventSchema = z.object({
  type: z.union([z.literal("user.created"), z.literal("user.updated")]),
  data: z.object({
    id: z.string(),
    email_addresses: z.array(
      z.object({
        email_address: z.string(),
        verification: z.object({ status: z.string() }).optional(),
      })
    ),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    image_url: z.string().nullable(),
    created_at: z.number(),
    updated_at: z.number(),
  }),
});

export const clerkUserDeletedEventSchema = z.object({
  type: z.literal("user.deleted"),
  data: z.object({ id: z.string() }),
});

export type ClerkBaseEvent = z.infer<typeof clerkBaseEventSchema>;
export type ClerkUserEvent = z.infer<typeof clerkUserEventSchema>;
export type ClerkUserDeletedEvent = z.infer<typeof clerkUserDeletedEventSchema>;
