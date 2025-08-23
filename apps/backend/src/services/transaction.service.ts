import { getDb } from "./mongo.service";
import type { Transaction } from "@backend/schemas/transaction.schema";
import type { User } from "@backend/schemas/user.schema";
import { ObjectId } from "mongodb";
import { readFile } from "fs/promises";

type Merchant = {
  name: string;
  category: string[];
  amountRange: [number, number];
};

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat2 = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

let merchantsCache: Merchant[] | null = null;
const loadMerchants = async (): Promise<Merchant[]> => {
  if (merchantsCache) return merchantsCache;
  const url = new URL("../data/merchants.json", import.meta.url);
  const raw = await readFile(url, "utf8");
  merchantsCache = JSON.parse(raw) as Merchant[];
  return merchantsCache;
};

const randomPaymentChannel = () => {
  const channels = ["in store", "online", "other"] as const;
  return channels[randomInt(0, channels.length - 1)];
};

const buildRandomTransaction = (
  clerkId: string,
  m: Merchant
): Omit<Transaction, "_id"> => {
  const [min, max] = m.amountRange;
  const baseAmount = randomFloat2(min, max);

  const isTransfer = m.category.includes("Transfer");
  const isPotentialIncome =
    m.category.includes("Deposit") || m.category.includes("Payroll");

  const isIncoming = isPotentialIncome
    ? true
    : isTransfer
      ? Math.random() < 0.3
      : false;

  const amount = isIncoming ? -baseAmount : baseAmount;

  const daysBack = randomInt(0, 119);
  const date = daysAgo(daysBack);

  const isRecent = daysBack <= 2;
  const status = isRecent && Math.random() < 0.5 ? "pending" : "cleared";

  return {
    clerkId,
    plaidTransactionId: `seed-${new ObjectId().toString()}`,
    plaidAccountId: "account-checking-01",
    amount,
    date,
    name: m.name,
    paymentChannel: randomPaymentChannel(),
    category: m.category,
    isoCurrencyCode: "USD",
    status,
  };
};

export const generateRandomTransactionsForUser = async (
  clerkId: string,
  count?: number
): Promise<Omit<Transaction, "_id">[]> => {
  const merchants = await loadMerchants();
  const n = count ?? randomInt(90, 100);

  const transactions: Omit<Transaction, "_id">[] = [];
  for (let i = 0; i < n; i++) {
    const m = merchants[randomInt(0, merchants.length - 1)];
    transactions.push(buildRandomTransaction(clerkId, m));
  }
  return transactions;
};

export const seedRandomTransactionsIfNone = async (clerkId: string) => {
  const db = await getDb();
  const transactionsCol = db.collection<Transaction>("transactions");
  const usersCol = db.collection<User>("users");

  const existingCount = await transactionsCol.countDocuments({ clerkId });
  if (existingCount > 0) {
    return {
      ok: true as const,
      seeded: 0,
      message: "User already has transactions",
    };
  }

  const docs = await generateRandomTransactionsForUser(clerkId);
  if (docs.length === 0) {
    return {
      ok: true as const,
      seeded: 0,
      message: "No transactions generated",
    };
  }

  await transactionsCol.insertMany(docs as any[]);
  await usersCol.updateOne(
    { clerkId },
    { $set: { seededTransactionsAt: new Date(), updatedAt: new Date() } }
  );

  console.log(`Seeded ${docs.length} random transactions for user ${clerkId}.`);
  return { ok: true as const, seeded: docs.length };
};

export const replaceWithSeedTransactions = async (
  clerkId: string,
  count?: number
) => {
  const db = await getDb();
  const transactionsCol = db.collection<Transaction>("transactions");
  const usersCol = db.collection<User>("users");

  // Remove everything, then seed fresh
  await transactionsCol.deleteMany({ clerkId });

  const docs = await generateRandomTransactionsForUser(clerkId, count);
  if (docs.length > 0) {
    await transactionsCol.insertMany(docs as any[]);
  }

  await usersCol.updateOne(
    { clerkId },
    { $set: { seededTransactionsAt: new Date(), updatedAt: new Date() } }
  );

  console.log(
    `Replaced transactions with ${docs.length} seeded transactions for user ${clerkId}.`
  );
  return { ok: true as const, seeded: docs.length };
};

// Existing helper for small fixed set seeding (kept for reference)
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
