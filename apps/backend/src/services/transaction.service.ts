import { getDb } from "./mongo.service";
import type { Transaction } from "@backend/schemas/transaction.schema";
import { ObjectId } from "mongodb";

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export const seedInitialTransactions = async (clerkId: string) => {
  try {
    const db = await getDb();
    const transactionsCollection = db.collection<Transaction>("transactions");

    const transactions: Omit<Transaction, "_id">[] = [
      {
        clerkId,
        plaidTransactionId: `tx-${new ObjectId()}`,
        plaidAccountId: "account-checking-01",
        amount: 12.75,
        date: daysAgo(1),
        name: "Uber Eats",
        paymentChannel: "online",
        category: ["Food and Drink", "Restaurants", "Delivery"],
        isoCurrencyCode: "USD",
        status: "pending",
      },
      {
        clerkId,
        plaidTransactionId: `tx-${new ObjectId()}`,
        plaidAccountId: "account-checking-01",
        amount: 7.21,
        date: daysAgo(2),
        name: "Starbucks",
        paymentChannel: "in store",
        category: ["Food and Drink", "Restaurants", "Coffee Shop"],
        isoCurrencyCode: "USD",
        status: "cleared",
      },
      {
        clerkId,
        plaidTransactionId: `tx-${new ObjectId()}`,
        plaidAccountId: "account-checking-01",
        amount: 89.5,
        date: daysAgo(3),
        name: "Amazon.com*Purchase",
        paymentChannel: "online",
        category: ["Shops", "Digital Purchase"],
        isoCurrencyCode: "USD",
        status: "cleared",
      },
      {
        clerkId,
        plaidTransactionId: `tx-${new ObjectId()}`,
        plaidAccountId: "account-checking-01",
        amount: -3200.0,
        date: daysAgo(8),
        name: "PAYROLL DEPOSIT - ACME INC",
        paymentChannel: "other",
        category: ["Transfer", "Deposit", "Payroll"],
        isoCurrencyCode: "USD",
        status: "cleared",
      },
      {
        clerkId,
        plaidTransactionId: `tx-${new ObjectId()}`,
        plaidAccountId: "account-checking-01",
        amount: 1850.0,
        date: daysAgo(22),
        name: "Zelle Transfer to Landlord",
        paymentChannel: "online",
        category: ["Transfer", "Payment", "Rent"],
        isoCurrencyCode: "USD",
        status: "cleared",
      },
    ];

    await transactionsCollection.insertMany(transactions as any[]);
    console.log(
      `Seeded ${transactions.length} initial transactions for user ${clerkId}.`
    );
  } catch (error) {
    console.error(`Failed to seed transactions for user ${clerkId}:`, error);
  }
};
