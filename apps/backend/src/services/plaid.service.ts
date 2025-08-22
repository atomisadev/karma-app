import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";

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

const accessTokens = new Map<string, string>();

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
  accessTokens.set(userId, data.access_token);
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
  const accessToken = accessTokens.get(userId);
  if (!accessToken)
    return { error: "No accessToken. Link account first." as const };

  let start = startDate;
  let end = endDate;

  if (!start || !end) {
    const s = new Date();
    s.setDate(s.getDate() - 30);
    start = s.toISOString().slice(0, 10);
    end = new Date().toISOString().slice(0, 10);
  }

  const { data } = await plaid.transactionsGet({
    access_token: accessToken,
    start_date: start!,
    end_date: end!,
    options: { count: 200, offset: 0 },
  });

  return { transactions: data.transactions };
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
  const accessToken = accessTokens.get(userId);
  if (!accessToken)
    return { error: "No accessToken. Link account first." as const };

  await plaid.sandboxTransactionsCreate({
    access_token: accessToken,
    transactions: transactions.map((t) => ({
      amount: t.amount,
      date_posted: t.datePosted,
      date_transacted: t.dateTransacted,
      description: t.description,
      iso_currency_code: t.isoCurrencyCode,
    })),
  });

  return { ok: true };
}
