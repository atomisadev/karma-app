import { z } from "zod";

export const userSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type User = z.infer<typeof userSchema>;

export const clerkWebhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string(),
    email_addresses: z.array(
      z.object({
        email_address: z.string(),
        verification: z.object({
          status: z.string(),
        }),
      })
    ),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    image_url: z.string().nullable(),
    created_at: z.number(),
    updated_at: z.number(),
  }),
});

export type ClerkWebhookEvent = z.infer<typeof clerkWebhookEventSchema>;
