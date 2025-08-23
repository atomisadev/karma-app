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

export const PlaidWebhookSchema = z
  .object({
    webhook_type: z.string(),
    webhook_code: z.string(),
    item_id: z.string(),
    new_transactions: z.number().optional(),
    removed_transactions: z.array(z.string()).optional(),
    environment: z.string().optional(),
    error: z.unknown().optional(),
  })
  .transform((v) => ({
    webhookType: v.webhook_type,
    webhookCode: v.webhook_code,
    itemId: v.item_id,
    newTransactions: v.new_transactions,
    removedTransactions: v.removed_transactions,
    environment: v.environment,
    error: v.error,
  }));

export type ExchangePublicTokenInput = z.infer<
  typeof ExchangePublicTokenSchema
>;
export type TransactionsQueryInput = z.infer<typeof TransactionsQuerySchema>;
export type PlaidWebhookInput = z.infer<typeof PlaidWebhookSchema>;
