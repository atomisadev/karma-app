import { z } from "zod";
import { type ObjectId } from "mongodb";

export const transactionSchema = z.object({
  _id: z.custom<ObjectId>(),
  clerkId: z.string(),
  plaidTransactionId: z.string(),
  plaidAccountId: z.string(),
  amount: z.number(),
  date: z.string(),
  name: z.string(),
  paymentChannel: z.string(),
  category: z.array(z.string()).optional(),
  isoCurrencyCode: z.string().nullable(),
  status: z.enum(["pending", "cleared"]).default("pending"),
});

export type Transaction = z.infer<typeof transactionSchema>;
