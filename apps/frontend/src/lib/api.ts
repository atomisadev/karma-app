import { treaty } from "@elysiajs/eden";

type RequestOptions = {
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
};

type EdenClient = {
  api: {
    plaid: {
      status: {
        get: (opts?: RequestOptions) => Promise<{ data?: { isConnected?: boolean } }>;
      };
      createLinkToken: {
        post: (body?: unknown, opts?: RequestOptions) => Promise<{ data?: { linkToken?: string } }>;
      };
      transactions: {
        get: (
          opts?: RequestOptions
        ) => Promise<{
          data?: {
            transactions?: Array<{
              transaction_id: string;
              name?: string | null;
              merchant_name?: string | null;
              date?: string;
              amount?: number;
            }>;
          };
        }>;
      };
      accounts: {
        get: (opts?: RequestOptions) => Promise<unknown>;
      };
      exchangePublicToken: {
        post: (body: { publicToken: string }, opts?: RequestOptions) => Promise<unknown>;
      };
      sandbox: {
        createTransactions: {
          post: (
            body: { transactions: Array<unknown> },
            opts?: RequestOptions
          ) => Promise<{ data?: { ok?: boolean; error?: string } }>;
        };
      };
    };
  };
};

export const eden = (treaty(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
) as unknown) as EdenClient;
