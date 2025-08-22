import { z } from "zod";

export const ExchangePublicTokenSchema = z.object({
  publicToken: z.string().min(1),
});

export const TransactionsQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const SandboxCreateTransactionsSchema = z.object({
  transactions: z
    .array(
      z.object({
        amount: z.number(),
        datePosted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTransacted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().min(1),
        isoCurrencyCode: z.string().optional(),
      })
    )
    .min(1)
    .max(10),
});

export type ExchangePublicTokenInput = z.infer<
  typeof ExchangePublicTokenSchema
>;
export type TransactionsQueryInput = z.infer<typeof TransactionsQuerySchema>;
