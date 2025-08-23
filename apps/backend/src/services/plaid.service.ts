import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  SandboxItemFireWebhookRequestWebhookCodeEnum,
  WebhookType,
  type Transaction as PlaidTransaction,
} from "plaid";
import { getDb } from "./mongo.service";
import type { User } from "@backend/schemas/user.schema";
import type { Transaction } from "@backend/schemas/transaction.schema";

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

  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const transactionsCollection = db.collection<Transaction>("transactions");

  let cursor: string | undefined = undefined;
  let added: PlaidTransaction[] = [];
  let hasMore = true;

  while (hasMore) {
    const request = {
      access_token: data.access_token,
      cursor: cursor,
    };
    const response = await plaid.transactionsSync(request);
    const newData = response.data;
    added = added.concat(newData.added);
    hasMore = newData.has_more;
    cursor = newData.next_cursor;
  }

  if (added.length > 0) {
    const initialTransactions = added.map((tx) => ({
      clerkId: userId,
      plaidTransactionId: tx.transaction_id,
      plaidAccountId: tx.account_id,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      paymentChannel: tx.payment_channel,
      category: tx.category || undefined,
      isoCurrencyCode: tx.iso_currency_code,
      pending: tx.pending,
    }));
    await transactionsCollection.insertMany(initialTransactions as any);
    console.log(
      `Pulled ${added.length} initial transactions for user ${userId}.`
    );
  }

  await usersCollection.updateOne(
    { clerkId: userId },
    {
      $set: {
        plaidAccessToken: data.access_token,
        plaidItemId: data.item_id,
        plaidConnectedAt: new Date(),
        plaidTransactionsCursor: cursor,
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
  const db = getDb();
  const transactionsCollection = db.collection<Transaction>("transactions");

  const query: Record<string, any> = { clerkId: userId };
  if (startDate) {
    query.date = { ...query.date, $gte: startDate };
  }
  if (endDate) {
    query.date = { ...query.date, $lte: endDate };
  }

  const userTransactions = await transactionsCollection
    .find(query)
    .sort({ date: -1 })
    .toArray();

  return {
    transactions: userTransactions.map((tx) => ({
      transaction_id: tx.plaidTransactionId,
      account_id: tx.plaidAccountId,
      amount: tx.amount,
      date: tx.date,
      name: tx.name,
      payment_channel: tx.paymentChannel,
      category: tx.category,
      iso_currency_code: tx.isoCurrencyCode,
      pending: tx.pending,
    })),
  };
}

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
    // console.log(
    //   "Account details:",
    //   data.accounts.map((acc) => ({
    //     id: acc.account_id,
    //     name: acc.name,
    //     type: acc.type,
    //     subtype: acc.subtype,
    //   }))
    // );

    return { accounts: data.accounts };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
}

export async function sandboxFireTransactionsWebhook({
  userId,
}: {
  userId: string;
}) {
  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user?.plaidAccessToken) {
    return { error: "No accessToken. Link account first." as const };
  }

  const { data } = await plaid.sandboxItemFireWebhook({
    access_token: user.plaidAccessToken,
    webhook_type: WebhookType.Transactions,
    webhook_code:
      SandboxItemFireWebhookRequestWebhookCodeEnum.SyncUpdatesAvailable,
  });

  return { ok: data.webhook_fired === true };
}
