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

export type ExchangePublicTokenInput = z.infer<
  typeof ExchangePublicTokenSchema
>;
export type TransactionsQueryInput = z.infer<typeof TransactionsQuerySchema>;
