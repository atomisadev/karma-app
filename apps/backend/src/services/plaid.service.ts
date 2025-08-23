import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import { getDb } from "./mongo.service";
import type { User } from "@backend/schemas/user.schema";

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || "";
const PLAID_SECRET = process.env.PLAID_SECRET || "";
const PLAID_ENV = (process.env.PLAID_ENV ||
  "sandbox") as keyof typeof PlaidEnvironments;

const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
        "PLAID-SECRET": PLAID_SECRET,
      },
    },
  })
);

export async function createLinkToken({ userId }: { userId: string }) {
  const { data } = await plaid.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Karma",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return { linkToken: data.link_token };
}

export async function exchangePublicToken({
  userId,
  publicToken,
}: {
  userId: string;
  publicToken: string;
}) {
  const { data } = await plaid.itemPublicTokenExchange({
    public_token: publicToken,
  });

  // Store access token in MongoDB instead of memory
  const db = getDb();
  const usersCollection = db.collection<User>("users");

  await usersCollection.updateOne(
    { clerkId: userId },
    {
      $set: {
        plaidAccessToken: data.access_token,
        plaidItemId: data.item_id,
        plaidConnectedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return { itemId: data.item_id };
}

export async function getTransactions({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate?: string;
  endDate?: string;
}) {
  console.log("=== getTransactions called ===");
  console.log("userId:", userId);
  console.log("startDate:", startDate);
  console.log("endDate:", endDate);

  // Get access token from MongoDB
  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const user = await usersCollection.findOne({ clerkId: userId });

  console.log("User found:", !!user);
  console.log("User has plaidAccessToken:", !!user?.plaidAccessToken);

  if (!user?.plaidAccessToken) {
    return { error: "No accessToken. Link account first." as const };
  }

  let start = startDate;
  let end = endDate;

  if (!start || !end) {
    const s = new Date();
    s.setDate(s.getDate() - 30);
    start = s.toISOString().slice(0, 10);

    const e = new Date();
    e.setDate(e.getDate() + 1);
    end = e.toISOString().slice(0, 10);
  }

  console.log(`Fetching transactions from ${start} to ${end}`);
  console.log(
    "Access token (first 10 chars):",
    user.plaidAccessToken.slice(0, 10) + "..."
  );

  try {
    const { data } = await plaid.transactionsGet({
      access_token: user.plaidAccessToken,
      start_date: start!,
      end_date: end!,
      options: { count: 200, offset: 0 },
    });

    console.log(`Found ${data.transactions.length} transactions`);
    console.log(
      "Transaction data:",
      data.transactions.map((t) => ({
        id: t.transaction_id,
        amount: t.amount,
        date: t.date,
        name: t.name,
        account_id: t.account_id,
      }))
    );

    return { transactions: data.transactions };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
}

export async function sandboxCreateTransactions({
  userId,
  transactions,
}: {
  userId: string;
  transactions: {
    amount: number;
    datePosted: string;
    dateTransacted: string;
    description: string;
    isoCurrencyCode?: string;
  }[];
}) {
  // Get access token from MongoDB
  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user?.plaidAccessToken) {
    return { error: "No accessToken. Link account first." as const };
  }

  console.log("Creating sandbox transactions:", transactions);
  console.log("User access token exists:", !!user.plaidAccessToken);

  try {
    const result = await plaid.sandboxTransactionsCreate({
      access_token: user.plaidAccessToken,
      transactions: transactions.map((t) => ({
        amount: t.amount,
        date_posted: t.datePosted,
        date_transacted: t.dateTransacted,
        description: t.description,
        iso_currency_code: t.isoCurrencyCode,
      })),
    });

    console.log("Sandbox transactions created successfully:", result);
    return { ok: true };
  } catch (error) {
    console.error("Error creating sandbox transactions:", error);
    throw error;
  }
}

// New function to check if user has connected Plaid account
export async function getUserPlaidStatus({ userId }: { userId: string }) {
  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const user = await usersCollection.findOne({ clerkId: userId });

  return {
    isConnected: !!user?.plaidAccessToken,
    connectedAt: user?.plaidConnectedAt,
    itemId: user?.plaidItemId,
  };
}

// Add this new function to check accounts
export async function getAccounts({ userId }: { userId: string }) {
  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user?.plaidAccessToken) {
    return { error: "No accessToken. Link account first." as const };
  }

  try {
    const { data } = await plaid.accountsGet({
      access_token: user.plaidAccessToken,
    });

    console.log("Accounts found:", data.accounts.length);
    console.log(
      "Account details:",
      data.accounts.map((acc) => ({
        id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
      }))
    );

    return { accounts: data.accounts };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}
