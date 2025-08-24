import { getDb } from "./mongo.service";
import type { Transaction } from "@backend/schemas/transaction.schema";
import type { User } from "@backend/schemas/user.schema";
import { ObjectId } from "mongodb";
import { readFile } from "fs/promises";
import {
  doesTransactionViolateInstruction,
  getSuggestedChallengeInstruction,
  isIndulgence,
} from "./cohere.service";

const KARMA_DECREMENT = 25;
const KARMA_INCREMENT = 25;

type Merchant = {
  name: string;
  category: string[];
  amountRange: [number, number];
};

const randomDateInMonth = (year: number, month: number): string => {
  const day = randomInt(1, 28);
  const date = new Date(year, month, day);
  return date.toISOString().slice(0, 10);
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

const buildExpenseTransaction = (
  clerkId: string,
  m: Merchant,
  date: string
): Omit<Transaction, "_id"> & { baseAmount: number } => {
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

  const status =
    new Date(date) > new Date(new Date().setDate(new Date().getDate() - 3)) &&
    Math.random() < 0.5
      ? "pending"
      : "cleared";

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
    baseAmount,
  };
};

const getStartOfLastNMonths = (months: number): Date[] => {
  const dates: Date[] = [];
  const now = new Date();
  now.setDate(1);
  for (let i = 0; i < months; i++) {
    dates.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
};

const getFirstDaysOfMonths = (months: number): string[] => {
  const dates = new Set<string>();
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dates.add(date.toISOString().slice(0, 10));
  }
  return Array.from(dates).sort();
};
export const generateRandomTransactionsForUser = async (
  clerkId: string,
  count?: number
): Promise<Omit<Transaction, "_id">[]> => {
  const merchants = await loadMerchants();
  const allTransactions: Omit<Transaction, "_id">[] = [];

  const monthlySalary = randomFloat2(5000, 10000);
  const monthStarts = getStartOfLastNMonths(4);

  for (const startDate of monthStarts) {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();

    const incomeTransaction: Omit<Transaction, "_id"> = {
      clerkId,
      plaidTransactionId: `seed-income-${year}-${month + 1}-${clerkId}`,
      plaidAccountId: "account-checking-01",
      amount: -monthlySalary,
      date: startDate.toISOString().slice(0, 10),
      name: "Monthly Salary Deposit",
      paymentChannel: "direct deposit",
      category: ["Financial", "Income"],
      isoCurrencyCode: "USD",
      status: "cleared",
    };
    allTransactions.push(incomeTransaction);

    const monthlySpendingTarget = monthlySalary * randomFloat2(0.7, 0.95);
    let currentMonthSpending = 0;
    let attempts = 0;

    while (currentMonthSpending < monthlySpendingTarget && attempts < 200) {
      const m = merchants[randomInt(0, merchants.length - 1)];

      if (
        m.name.includes("Rent") &&
        monthlySpendingTarget - currentMonthSpending < 1500
      ) {
        attempts++;
        continue;
      }

      const date = randomDateInMonth(year, month);
      const expenseTx = buildExpenseTransaction(clerkId, m, date);

      if (
        currentMonthSpending + expenseTx.baseAmount <=
        monthlySpendingTarget
      ) {
        currentMonthSpending += expenseTx.baseAmount;
        const { baseAmount, ...finalTx } = expenseTx;
        allTransactions.push(finalTx);
      }
      attempts++;
    }
  }

  return allTransactions;
};

export const replaceWithSeedTransactions = async (
  clerkId: string,
  count?: number
) => {
  const db = await getDb();
  const transactionsCol = db.collection<Transaction>("transactions");
  const usersCol = db.collection<User>("users");

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

const toYMD = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, days: number) => {
  const newDate = new Date(d);
  newDate.setDate(d.getDate() + days);
  return newDate;
};

export const processNewTransactionForKarma = async (
  userId: string,
  newTransaction: Transaction
) => {
  const db = getDb();
  const users = db.collection<User>("users");
  const transactions = db.collection<Transaction>("transactions");
  const user = await users.findOne({ clerkId: userId });

  if (!user) return;

  let currentUserState = user;

  if (currentUserState.activeChallenge) {
    const { instruction, dateSet } = currentUserState.activeChallenge;
    const challengeDayYMD = toYMD(addDays(dateSet, 1));
    const staleDateYMD = toYMD(addDays(dateSet, 2));
    const txYMD = newTransaction.date;

    if (txYMD === challengeDayYMD) {
      if (
        await doesTransactionViolateInstruction(instruction, newTransaction)
      ) {
        console.log(`User ${userId} failed challenge: "${instruction}"`);
        const newScore = Math.max(300, user.karmaScore - KARMA_DECREMENT);
        await users.updateOne(
          { clerkId: userId },
          { $set: { karmaScore: newScore }, $unset: { activeChallenge: "" } }
        );
        return;
      }
    } else if (txYMD >= staleDateYMD) {
      const challengeDayTxs = await transactions
        .find({ clerkId: userId, date: challengeDayYMD })
        .toArray();

      let wasViolated = false;
      for (const tx of challengeDayTxs) {
        if (await doesTransactionViolateInstruction(instruction, tx)) {
          wasViolated = true;
          break;
        }
      }

      if (!wasViolated) {
        console.log(`User ${userId} succeeded in challenge: "${instruction}"`);
        const newScore = Math.min(850, user.karmaScore + KARMA_INCREMENT);
        await users.updateOne(
          { clerkId: userId },
          { $set: { karmaScore: newScore } }
        );
      }

      await users.updateOne(
        { clerkId: userId },
        { $unset: { activeChallenge: "" } }
      );
      console.log(`Cleared stale challenge for user ${userId}.`);
    }
  }

  const potentiallyUpdatedUser = await users.findOne({ clerkId: userId });
  if (!potentiallyUpdatedUser?.activeChallenge) {
    const isTxIndulgence = await isIndulgence(
      newTransaction.name,
      newTransaction.category
    );

    if (isTxIndulgence) {
      const recentTx = await transactions
        .find({ clerkId: userId })
        .sort({ date: -1 })
        .limit(30)
        .toArray();

      let newInstruction = await getSuggestedChallengeInstruction(
        recentTx,
        newTransaction
      );

      if (newInstruction) {
        newInstruction = newInstruction.trim().replace(/^"|"$/g, "");

        console.log(`Setting new challenge for ${userId}: "${newInstruction}"`);
        await users.updateOne(
          { clerkId: userId },
          {
            $set: {
              activeChallenge: {
                instruction: newInstruction,
                dateSet: new Date(),
              },
            },
          }
        );
      }
    }
  }
};
