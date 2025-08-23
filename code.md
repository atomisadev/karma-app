Project Path: apps

Source Tree:

```txt
apps
├── backend
│   ├── README.md
│   ├── package.json
│   ├── src
│   │   ├── app.ts
│   │   ├── config
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── plugin
│   │   │   └── clerk.ts
│   │   ├── routes
│   │   │   ├── clerk-webhook.route.ts
│   │   │   ├── plaid-webhook.route.ts
│   │   │   └── plaid.route.ts
│   │   ├── schemas
│   │   │   ├── plaid.schema.ts
│   │   │   ├── transaction.schema.ts
│   │   │   └── user.schema.ts
│   │   └── services
│   │       ├── mongo.service.ts
│   │       ├── plaid.service.ts
│   │       └── transaction.service.ts
│   └── tsconfig.json
└── frontend
    ├── README.md
    ├── components.json
    ├── eslint.config.mjs
    ├── next.config.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── public
    │   ├── file.svg
    │   ├── globe.svg
    │   ├── next.svg
    │   ├── vercel.svg
    │   └── window.svg
    ├── src
    │   ├── app
    │   │   ├── (app)
    │   │   │   ├── _hooks
    │   │   │   │   └── use-plaid.ts
    │   │   │   ├── admin
    │   │   │   │   ├── _components
    │   │   │   │   │   └── transactions-form.tsx
    │   │   │   │   ├── _hooks
    │   │   │   │   │   └── use-admin-transactions.ts
    │   │   │   │   └── page.tsx
    │   │   │   ├── layout.tsx
    │   │   │   └── page.tsx
    │   │   ├── (auth)
    │   │   │   ├── sign-in
    │   │   │   │   └── [[...sign-in]]
    │   │   │   │       └── page.tsx
    │   │   │   └── sign-up
    │   │   │       └── [[...sign-up]]
    │   │   │           └── page.tsx
    │   │   ├── favicon.ico
    │   │   ├── globals.css
    │   │   └── layout.tsx
    │   ├── components
    │   │   ├── providers.tsx
    │   │   └── ui
    │   │       └── skeleton.tsx
    │   ├── lib
    │   │   ├── api.ts
    │   │   └── utils.ts
    │   └── middleware.ts
    └── tsconfig.json

```

`apps/backend/README.md`:

```md
# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.38. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

```

`apps/backend/package.json`:

```json
{
  "name": "backend",
  "module": "src/index.ts",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "start": "bun dist/index.js",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/bun": "^1.2.20"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "@clerk/backend": "^2.9.4",
    "@elysiajs/cors": "^1.3.3",
    "elysia": "^1.3.15",
    "elysia-clerk": "^0.12.1",
    "mongodb": "^6.18.0",
    "plaid": "^38.0.0",
    "svix": "^1.74.1",
    "zod": "^4.0.17"
  }
}

```

`apps/backend/src/app.ts`:

```ts
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { clerkPlugin } from "elysia-clerk";
import type { ElysiaErrors } from "elysia/error";
import { plaidRoutes } from "./routes/plaid.route";
import { clerkWebhookRoutes } from "./routes/clerk-webhook.route";
import { env } from "./config";
import { plaidWebhookRoutes } from "./routes/plaid-webhook.route";

export const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "authorization",
        "content-type",
        "accept",
        "origin",
        "x-requested-with",
        "svix-id",
        "svix-timestamp",
        "svix-signature",
      ],
      exposeHeaders: ["authorization", "content-type", "accept", "origin"],
    })
  )
  .use(clerkPlugin())
  .use(clerkWebhookRoutes)
  .use(plaidWebhookRoutes)
  .derive((ctx) => ({
    requireAuth: () => {
      const { userId } = ctx.auth();
      if (!userId) {
        ctx.set.status = 401;
        throw new Error("Unauthorized");
      }
      return userId;
    },
  }))
  .onError(({ code, error, request, set }) => {
    console.error(
      `[${request.method}] ${request.url} -> ${code}`,
      (error as ElysiaErrors).stack || error
    );
    set.status = typeof code === "number" ? code : 500;
    return { error: "Internal server error" };
  });

export type App = typeof app;

```

`apps/backend/src/config/index.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).optional(),
  BACKEND_PUBLIC_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
  PLAID_SECRET: process.env.PLAID_SECRET,
  PLAID_ENV: process.env.PLAID_ENV,
  BACKEND_PUBLIC_URL: process.env.BACKEND_PUBLIC_URL,
});

```

`apps/backend/src/index.ts`:

```ts
import { app as baseApp } from "./app";

import { plaidRoutes } from "./routes/plaid.route";
import { clerkWebhookRoutes } from "./routes/clerk-webhook.route";
import { connectToDb } from "./services/mongo.service";
import { plaidWebhookRoutes } from "./routes/plaid-webhook.route";

await connectToDb();

const app = baseApp
  .get("/", () => ({ message: "Hello from Elysia!" }))
  .use(plaidRoutes)
  .listen({ port: 3001, hostname: "0.0.0.0" });

console.log(
  `Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;

```

`apps/backend/src/plugin/clerk.ts`:

```ts
import { Elysia, error } from "elysia";
import { clerkPlugin } from "elysia-clerk";

export const clerkAuth = new Elysia()
  .use(clerkPlugin())
  .onBeforeHandle((ctx) => {
    const auth = ctx.auth();
    if (!auth?.userId) return error(401);
  });

```

`apps/backend/src/routes/clerk-webhook.route.ts`:

```ts
import { Elysia } from "elysia";
import { Webhook } from "svix";
import { env } from "@backend/config";
import { getDb } from "@backend/services/mongo.service";
import {
  clerkBaseEventSchema,
  clerkUserEventSchema,
  clerkUserDeletedEventSchema,
  userSchema,
  type User,
  type ClerkUserEvent,
  type ClerkUserDeletedEvent,
} from "@backend/schemas/user.schema";

export const clerkWebhookRoutes = new Elysia({ prefix: "/webhook" }).post(
  "/clerk",
  async ({ body, headers, set }) => {
    try {
      const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET);

      const svixId = headers["svix-id"];
      const svixTimestamp = headers["svix-timestamp"];
      const svixSignature = headers["svix-signature"];

      if (!svixId || !svixTimestamp || !svixSignature) {
        set.status = 400;
        return { error: "Missing svix headers" };
      }

      let event: unknown;
      try {
        event = webhook.verify(JSON.stringify(body), {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
      } catch (err) {
        console.error("Webhook verification failed:", err);
        set.status = 400;
        return { error: "Webhook verification failed" };
      }

      const baseEvent = clerkBaseEventSchema.parse(event);

      switch (baseEvent.type) {
        case "user.created":
          console.log("User created");
          await handleUserCreated(clerkUserEventSchema.parse(event));
          break;
        case "user.updated":
          console.log("User updated");
          await handleUserUpdated(clerkUserEventSchema.parse(event));
          break;
        case "user.deleted":
          console.log("User deleted");
          await handleUserDeleted(clerkUserDeletedEventSchema.parse(event));
          break;
        default:
          break;
      }

      return { success: true };
    } catch (error) {
      console.error("Webhook error:", error);
      set.status = 500;
      return { error: "Internal server error" };
    }
  }
);

const handleUserCreated = async (event: ClerkUserEvent) => {
  try {
    const { data } = event;

    const primaryEmail =
      data.email_addresses.find(
        (email: any) => email.verification?.status === "verified"
      ) || data.email_addresses[0];

    if (!primaryEmail) {
      console.error("No email found for user:", data.id);
      return;
    }

    const userData: Omit<User, "createdAt" | "updatedAt"> = {
      clerkId: data.id,
      email: primaryEmail.email_address,
      firstName: data.first_name || undefined,
      lastName: data.last_name || undefined,
      imageUrl: data.image_url || undefined,
    };

    const validatedUser = userSchema.parse({
      ...userData,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });

    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const existingUser = await usersCollection.findOne({ clerkId: data.id });
    if (existingUser) {
      console.log("User already exists:", data.id);
      return;
    }

    const result = await usersCollection.insertOne(validatedUser);
    console.log("User created successfully:", result.insertedId);
  } catch (error) {
    console.error("Error handling user creation:", error);
    throw error;
  }
};

const handleUserUpdated = async (event: ClerkUserEvent) => {
  try {
    const { data } = event;

    const primaryEmail =
      data.email_addresses.find(
        (email: any) => email.verification?.status === "verified"
      ) || data.email_addresses[0];

    if (!primaryEmail) {
      console.error("No email found for user:", data.id);
      return;
    }

    const updateData = {
      email: primaryEmail.email_address,
      firstName: data.first_name || undefined,
      lastName: data.last_name || undefined,
      imageUrl: data.image_url || undefined,
      updatedAt: new Date(data.updated_at),
    };

    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const result = await usersCollection.updateOne(
      { clerkId: data.id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log("User not found for update:", data.id);
      return;
    }

    console.log("User updated successfully:", data.id);
  } catch (error) {
    console.error("Error handling user update:", error);
    throw error;
  }
};

const handleUserDeleted = async (event: ClerkUserDeletedEvent) => {
  try {
    const { data } = event;

    const db = await getDb();
    const usersCollection = db.collection<User>("users");

    const result = await usersCollection.deleteOne({ clerkId: data.id });

    if (result.deletedCount === 0) {
      console.log("User not found for deletion:", data.id);
      return;
    }

    console.log("User deleted successfully:", data.id);
  } catch (error) {
    console.error("Error handling user deletion:", error);
    throw error;
  }
};

```

`apps/backend/src/routes/plaid-webhook.route.ts`:

```ts
import {
  PlaidWebhookSchema,
  type PlaidWebhookInput,
} from "@backend/schemas/plaid.schema";
import type { User } from "@backend/schemas/user.schema";
import { getDb } from "@backend/services/mongo.service";
import Elysia from "elysia";
import { z } from "zod";
import { PlaidApi, Configuration, PlaidEnvironments } from "plaid";
import { type Transaction } from "@backend/schemas/transaction.schema";

const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

export const plaidWebhookRoutes = new Elysia({ prefix: "/webhook" }).post(
  "/plaid",
  async ({ body, set }) => {
    const parsed = PlaidWebhookSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { ok: false, error: "Invalid webhook payload" };
    }

    const event = parsed.data as PlaidWebhookInput;

    if (event.webhookType !== "TRANSACTIONS") {
      return { ok: true, ignored: true };
    }

    try {
      const db = await getDb();
      const users = db.collection<User>("users");
      const transactionsCollection = db.collection<Transaction>("transactions");

      const user = await users.findOne({ plaidItemId: event.itemId });
      if (!user) {
        return { ok: true, unknownItem: true };
      }

      console.log(`Plaid - ${event.webhookCode} received`);

      switch (event.webhookCode) {
        case "DEFAULT_UPDATE":
        case "INITIAL_UPDATE":
        case "HISTORICAL_UPDATE":
        case "SYNC_UPDATES_AVAILABLE":
          await new Promise((resolve) => setTimeout(resolve, 1500));

          let hasMore = true;
          let cursor = user.plaidTransactionsCursor;

          while (hasMore) {
            const { data } = await plaid.transactionsSync({
              access_token: user.plaidAccessToken!,
              cursor: cursor,
            });

            const upsertOperations = [...data.added, ...data.modified].map(
              (tx) => ({
                updateOne: {
                  filter: { plaidTransactionId: tx.transaction_id },
                  update: {
                    $set: {
                      clerkId: user.clerkId,
                      plaidTransactionId: tx.transaction_id,
                      plaidAccountId: tx.account_id,
                      amount: tx.amount,
                      date: tx.date,
                      name: tx.name,
                      paymentChannel: tx.payment_channel,
                      category: tx.category || undefined,
                      isoCurrencyCode: tx.iso_currency_code,
                      status: tx.pending ? "pending" : "cleared",
                    },
                  },
                  upsert: true,
                },
              })
            );

            if (upsertOperations.length > 0) {
              await transactionsCollection.bulkWrite(upsertOperations as any);
              console.log(`Synced ${upsertOperations.length} transactions.`);
            }

            if (data.removed.length > 0) {
              const removedIds = data.removed.map((tx) => tx.transaction_id);
              await transactionsCollection.deleteMany({
                plaidTransactionId: { $in: removedIds },
              });
              console.log(`Removed ${data.removed.length} transactions.`);
            }

            hasMore = data.has_more;
            cursor = data.next_cursor;
          }

          await users.updateOne(
            { clerkId: user.clerkId },
            { $set: { plaidTransactionsCursor: cursor } }
          );
          break;
        case "TRANSACTIONS_REMOVED":
          break;
        default:
          break;
      }

      return { ok: true };
    } catch (error) {
      console.error("Plaid webhook error:", error);
      set.status = 500;
      return { ok: false, error: "Internal server error" };
    }
  }
);

```

`apps/backend/src/routes/plaid.route.ts`:

```ts
import { Elysia } from "elysia";
import {
  createLinkToken,
  disconnectPlaidItem,
  exchangePublicToken,
  getAccounts,
  getTransactions,
  getUserPlaidStatus,
  sandboxFireTransactionsWebhook,
} from "../services/plaid.service";
import {
  ExchangePublicTokenSchema,
  SandboxCreateTransactionsSchema,
  TransactionsQuerySchema,
} from "../schemas/plaid.schema";
import type { App } from "../app";
import { getDb } from "../services/mongo.service";
import type { Transaction } from "../schemas/transaction.schema";

export const plaidRoutes = (app: App) =>
  app.group("/api/plaid", (group) =>
    group
      .post("/createLinkToken", async ({ requireAuth }) => {
        const userId = requireAuth();
        const res = await createLinkToken({ userId: userId });
        return res;
      })
      .post("/exchangePublicToken", async ({ body, set, requireAuth }) => {
        const userId = requireAuth();
        const parsed = ExchangePublicTokenSchema.safeParse(body);
        if (!parsed.success) {
          set.status = 400;
          return { error: "Invalid body" };
        }
        const res = await exchangePublicToken({
          userId: userId,
          publicToken: parsed.data.publicToken,
        });
        return res;
      })
      .post("/disconnect", async ({ requireAuth }) => {
        const userId = requireAuth();
        return await disconnectPlaidItem({ userId });
      })
      .post("/sandbox/fireWebhook", async ({ requireAuth }) => {
        const userId = requireAuth();
        const result = await sandboxFireTransactionsWebhook({ userId });
        return result;
      })
      .get("/transactions", async ({ query, set, requireAuth }) => {
        const userId = requireAuth();
        const parsed = TransactionsQuerySchema.safeParse(query);
        if (!parsed.success) {
          set.status = 400;
          return { transactions: [], error: "Invalid query" };
        }
        const res = await getTransactions({
          userId: userId,
          ...parsed.data,
        });
        if ("error" in res) {
          set.status = 400;
          return { transactions: [], error: res.error };
        }
        return { transactions: res.transactions };
      })
      .post(
        "/sandbox/createTransactions",
        async ({ body, set, requireAuth }) => {
          const userId = requireAuth();
          const parsed = SandboxCreateTransactionsSchema.safeParse(body);
          if (!parsed.success) {
            set.status = 400;
            return { ok: false, error: "Invalid body" };
          }

          const { transactions } = parsed.data;

          try {
            const db = getDb();
            const transactionsCollection =
              db.collection<Transaction>("transactions");

            const documents = transactions.map((t) => ({
              clerkId: userId,
              plaidTransactionId: `manual-tx-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 9)}`,
              plaidAccountId: "manual-account",
              amount: t.amount,
              date: t.datePosted,
              name: t.description,
              paymentChannel: "manual",
              category: ["Manual", "Custom"],
              isoCurrencyCode: t.isoCurrencyCode || "USD",
              status: "pending" as const,
            }));

            await transactionsCollection.insertMany(documents as any);
            console.log(
              `Successfully created ${documents.length} manual transactions.`
            );

            return { ok: true };
          } catch (error) {
            console.error("Error creating manual transactions:", error);
            set.status = 500;
            return { ok: false, error: "Internal server error" };
          }
        }
      )
      .get("/status", async ({ requireAuth }) => {
        const userId = requireAuth();
        const status = await getUserPlaidStatus({ userId });
        return status;
      })
      .get("/accounts", async ({ requireAuth }) => {
        const userId = requireAuth();
        const result = await getAccounts({ userId });
        return result;
      })
  );

```

`apps/backend/src/schemas/plaid.schema.ts`:

```ts
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

```

`apps/backend/src/schemas/transaction.schema.ts`:

```ts
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

```

`apps/backend/src/schemas/user.schema.ts`:

```ts
import { z } from "zod";

export const userSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  imageUrl: z.string().optional(),
  plaidAccessToken: z.string().optional(),
  plaidItemId: z.string().optional(),
  plaidConnectedAt: z.date().optional(),
  plaidTransactionsCursor: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type User = z.infer<typeof userSchema>;

export const clerkBaseEventSchema = z.object({
  type: z.string(),
  data: z.unknown(),
});

export const clerkUserEventSchema = z.object({
  type: z.union([z.literal("user.created"), z.literal("user.updated")]),
  data: z.object({
    id: z.string(),
    email_addresses: z.array(
      z.object({
        email_address: z.string(),
        verification: z.object({ status: z.string() }).optional(),
      })
    ),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    image_url: z.string().nullable(),
    created_at: z.number(),
    updated_at: z.number(),
  }),
});

export const clerkUserDeletedEventSchema = z.object({
  type: z.literal("user.deleted"),
  data: z.object({ id: z.string() }),
});

export type ClerkBaseEvent = z.infer<typeof clerkBaseEventSchema>;
export type ClerkUserEvent = z.infer<typeof clerkUserEventSchema>;
export type ClerkUserDeletedEvent = z.infer<typeof clerkUserDeletedEventSchema>;

```

`apps/backend/src/services/mongo.service.ts`:

```ts
import { MongoClient, Db } from "mongodb";
import { env } from "@backend/config";

let db: Db | null = null;
const client = new MongoClient(env.MONGODB_URI);

export const connectToDb = async () => {
  if (db) return db;

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    db = client.db(env.MONGODB_DB);
    console.log("Successfully connected to MongoDB.");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Calll connectToDb first.");
  }
  return db;
};

```

`apps/backend/src/services/plaid.service.ts`:

```ts
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
import { env } from "@backend/config";

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
  const webhookUrl = env.BACKEND_PUBLIC_URL
    ? `${env.BACKEND_PUBLIC_URL}/webhook/plaid`
    : undefined;

  if (webhookUrl) {
    console.log(`Configuring Plaid Link with webhook URL: ${webhookUrl}`);
  }

  const { data } = await plaid.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Karma",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook: webhookUrl,
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

  console.log(
    `Clearing any existing transactions for user ${userId} before sync`
  );
  await transactionsCollection.deleteMany({ clerkId: userId });

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
      status: tx.pending ? ("pending" as const) : ("cleared" as const),
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

  const today = new Date().toISOString().slice(0, 10);
  const result = await transactionsCollection.updateMany(
    { clerkId: userId, status: "pending", date: { $lte: today } },
    { $set: { status: "cleared" } }
  );

  if (result.modifiedCount > 0) {
    console.log(`Cleared ${result.modifiedCount} pending transactions.`);
  }

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
      status: tx.status,
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

export async function disconnectPlaidItem({ userId }: { userId: string }) {
  const db = getDb();
  const usersCollection = db.collection<User>("users");
  const transactionsCollection = db.collection<Transaction>("transactions");

  const user = await usersCollection.findOne({ clerkId: userId });

  if (!user || !user.plaidAccessToken) {
    return { ok: true, message: "No Plaid connection to disconnect." };
  }

  try {
    await plaid.itemRemove({
      access_token: user.plaidAccessToken,
    });
  } catch (error) {
    console.error(
      `Could not invalidate Plaid access token for user ${userId}:`,
      error
    );
  }

  await usersCollection.updateOne(
    {
      clerkId: userId,
    },
    {
      $unset: {
        plaidAccessToken: "",
        plaidItemId: "",
        plaidConnectedAt: "",
        plaidTransactionsCursor: "",
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const { deletedCount } = await transactionsCollection.deleteMany({
    clerkId: userId,
  });

  console.log(
    `Disconnected Plaid for user ${userId}. Removed ${deletedCount} transactions.`
  );

  return { ok: true };
}

```

`apps/backend/src/services/transaction.service.ts`:

```ts
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

```

`apps/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    // Enable latest features
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,

    // Some stricter flags (disabled by default)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false,

    "baseUrl": ".",
    "paths": {
      "@backend/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

```

`apps/frontend/README.md`:

```md
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```

`apps/frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

`apps/frontend/eslint.config.mjs`:

```mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;

```

`apps/frontend/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

```

`apps/frontend/package.json`:

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.31.4",
    "@elysiajs/eden": "^1.3.2",
    "@tanstack/react-query": "^5.85.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.541.0",
    "next": "15.5.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-plaid-link": "^4.1.1",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.5.0",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.3.7",
    "typescript": "^5"
  }
}

```

`apps/frontend/postcss.config.mjs`:

```mjs
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;

```

`apps/frontend/public/file.svg`:

```svg
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
```

`apps/frontend/public/globe.svg`:

```svg
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
```

`apps/frontend/public/next.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
```

`apps/frontend/public/vercel.svg`:

```svg
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
```

`apps/frontend/public/window.svg`:

```svg
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
```

`apps/frontend/src/app/(app)/_hooks/use-plaid.ts`:

```ts
"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export function usePlaid() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: statusData,
    isLoading: checkingStatus,
    error: statusError,
  } = useQuery({
    queryKey: ["plaid", "status"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await eden.api.plaid.status.get({
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isSignedIn,
  });

  const isConnected = statusData?.isConnected || false;

  const { data: linkTokenData, isLoading: linkTokenLoading } = useQuery({
    queryKey: ["plaid", "linkToken"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await eden.api.plaid.createLinkToken.post(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isSignedIn && !isConnected && !checkingStatus,
  });

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["plaid", "transactions"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await eden.api.plaid.transactions.get({
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: isSignedIn && isConnected,
  });

  const fireWebhookMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      return eden.api.plaid.sandbox.fireWebhook.post(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      console.log("Sandbox webhook fired. Fetching transactions in 2.5s...");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
      }, 2500);
    },
  });

  const exchangeTokenMutation = useMutation({
    mutationFn: async (publicToken: string) => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      return eden.api.plaid.exchangePublicToken.post(
        { publicToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaid", "status"] });
      fireWebhookMutation.mutate();
    },
  });

  const onLinkSuccess = useCallback(
    (publicToken: string) => {
      exchangeTokenMutation.mutate(publicToken);
    },
    [exchangeTokenMutation]
  );

  const refreshTransactions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
    refetchTransactions();
  }, [refetchTransactions, queryClient]);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      return eden.api.plaid.disconnect.post(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaid"] });
    },
  });

  return {
    linkToken: linkTokenData?.linkToken || null,
    transactions: transactionsData?.transactions || [],
    loading: exchangeTokenMutation.isPending,
    isConnected,
    checkingStatus: checkingStatus || linkTokenLoading,
    transactionsLoading,
    onLinkSuccess,
    refreshTransactions,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}

```

`apps/frontend/src/app/(app)/admin/_components/transactions-form.tsx`:

```tsx
"use client";

import type { TransactionInput } from "../_hooks/use-admin-transactions";

export function TransactionsForm({
  rows,
  addRow,
  removeRow,
  updateRow,
  submit,
  addPresetTransaction,
  loading,
  error,
  ok,
}: {
  rows: TransactionInput[];
  addRow: () => void;
  removeRow: (i: number) => void;
  updateRow: (i: number, patch: Partial<TransactionInput>) => void;
  submit: () => void;
  addPresetTransaction: (
    type: "coffee" | "grocery" | "gas" | "restaurant" | "income"
  ) => void;
  loading: boolean;
  error: string | null;
  ok: boolean;
}) {
  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create Custom Transactions</h2>
        <div className="flex gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => addRow()}
            disabled={rows.length >= 10}
          >
            Add Empty Row
          </button>
        </div>
      </div>

      {/* Preset Transaction Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Quick Add Presets:
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-amber-100 text-amber-800 px-3 py-1 text-sm hover:bg-amber-200"
            onClick={() => addPresetTransaction("coffee")}
            disabled={rows.length >= 10}
          >
            ☕ Coffee (-$4.50)
          </button>
          <button
            className="rounded-md bg-green-100 text-green-800 px-3 py-1 text-sm hover:bg-green-200"
            onClick={() => addPresetTransaction("grocery")}
            disabled={rows.length >= 10}
          >
            🛒 Grocery (-$75.30)
          </button>
          <button
            className="rounded-md bg-blue-100 text-blue-800 px-3 py-1 text-sm hover:bg-blue-200"
            onClick={() => addPresetTransaction("gas")}
            disabled={rows.length >= 10}
          >
            ⛽ Gas (-$45.00)
          </button>
          <button
            className="rounded-md bg-purple-100 text-purple-800 px-3 py-1 text-sm hover:bg-purple-200"
            onClick={() => addPresetTransaction("restaurant")}
            disabled={rows.length >= 10}
          >
            🍽️ Restaurant (-$28.75)
          </button>
          <button
            className="rounded-md bg-emerald-100 text-emerald-800 px-3 py-1 text-sm hover:bg-emerald-200"
            onClick={() => addPresetTransaction("income")}
            disabled={rows.length >= 10}
          >
            💰 Salary (+$2500.00)
          </button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Date Posted</th>
              <th className="text-left p-3">Date Transacted</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Currency</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <input
                    className="w-32 rounded border px-2 py-1 text-right"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={Number.isFinite(r.amount) ? r.amount : ""}
                    onChange={(e) =>
                      updateRow(i, {
                        amount: parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="date"
                    value={r.datePosted}
                    onChange={(e) =>
                      updateRow(i, { datePosted: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-40 rounded border px-2 py-1"
                    type="date"
                    value={r.dateTransacted}
                    onChange={(e) =>
                      updateRow(i, { dateTransacted: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-64 rounded border px-2 py-1"
                    placeholder="Transaction description..."
                    value={r.description}
                    onChange={(e) =>
                      updateRow(i, { description: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-20 rounded border px-2 py-1"
                    placeholder="USD"
                    value={r.isoCurrencyCode || ""}
                    onChange={(e) =>
                      updateRow(i, { isoCurrencyCode: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <button
                    className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <div className="text-sm text-red-600">❌ {error}</div>
        </div>
      )}

      {ok && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <div className="text-sm text-green-600">
            ✅ Transactions created successfully! Check the main page to see
            them.
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-md bg-black text-white px-6 py-2 disabled:opacity-50"
          onClick={() => submit()}
          disabled={
            loading ||
            rows.length === 0 ||
            rows.every((r) => !r.description.trim())
          }
        >
          {loading
            ? "Creating..."
            : `Create ${rows.length} Transaction${rows.length !== 1 ? "s" : ""}`}
        </button>

        <button
          className="rounded-md border px-4 py-2 text-gray-600"
          onClick={() => (window.location.href = "/")}
        >
          ← Back to Transactions
        </button>
      </div>
    </div>
  );
}

```

`apps/frontend/src/app/(app)/admin/_hooks/use-admin-transactions.ts`:

```ts
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

export type TransactionInput = {
  amount: number;
  datePosted: string;
  dateTransacted: string;
  description: string;
  isoCurrencyCode?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const newRow = (): TransactionInput => ({
  amount: 0,
  datePosted: today(),
  dateTransacted: today(),
  description: "",
  isoCurrencyCode: "USD",
});

export function useAdminTransactions() {
  const [rows, setRows] = useState<TransactionInput[]>([newRow()]);
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const createTransactionsMutation = useMutation({
    mutationFn: async (transactions: TransactionInput[]) => {
      if (!isSignedIn) throw new Error("Please sign in");

      const token = await getToken();
      if (!token) throw new Error("Missing auth token");

      const response = await eden.api.plaid.sandbox.createTransactions.post(
        { transactions },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.ok) {
        throw new Error(
          response.data?.error || "Failed to create transactions"
        );
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaid", "transactions"] });
      setRows([newRow()]);
    },
  });

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows([...rows, newRow()]);
  };

  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, patch: Partial<TransactionInput>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = () => {
    createTransactionsMutation.mutate(rows);
  };

  const addPresetTransaction = (
    type: "coffee" | "grocery" | "gas" | "restaurant" | "income"
  ) => {
    const presets = {
      coffee: {
        amount: 4.5,
        description: "Coffee Shop",
        isoCurrencyCode: "USD",
      },
      grocery: {
        amount: 75.3,
        description: "Grocery Store",
        isoCurrencyCode: "USD",
      },
      gas: {
        amount: 45.0,
        description: "Gas Station",
        isoCurrencyCode: "USD",
      },
      restaurant: {
        amount: 28.75,
        description: "Restaurant",
        isoCurrencyCode: "USD",
      },
      income: {
        amount: -2500.0,
        description: "Salary Deposit",
        isoCurrencyCode: "USD",
      },
    };

    const preset = presets[type];
    setRows([
      ...rows,
      {
        ...newRow(),
        ...preset,
      },
    ]);
  };

  return {
    rows,
    addRow,
    removeRow,
    updateRow,
    submit,
    addPresetTransaction,
    loading: createTransactionsMutation.isPending,
    error: createTransactionsMutation.error?.message || null,
    ok: createTransactionsMutation.isSuccess,
  };
}

```

`apps/frontend/src/app/(app)/admin/page.tsx`:

```tsx
"use client";

import { TransactionsForm } from "./_components/transactions-form";
import { useAdminTransactions } from "./_hooks/use-admin-transactions";

export default function AdminPage() {
  const {
    rows,
    addRow,
    removeRow,
    updateRow,
    submit,
    addPresetTransaction,
    loading,
    error,
    ok,
  } = useAdminTransactions();

  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-gray-50">
      <div className="w-full max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Create custom transactions for testing and development
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <TransactionsForm
            rows={rows}
            addRow={addRow}
            removeRow={removeRow}
            updateRow={updateRow}
            submit={submit}
            addPresetTransaction={addPresetTransaction}
            loading={loading}
            error={error}
            ok={ok}
          />
        </div>
      </div>
    </div>
  );
}

```

`apps/frontend/src/app/(app)/layout.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return children;
}

```

`apps/frontend/src/app/(app)/page.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { Skeleton } from "@/components/ui/skeleton";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export default function Home() {
  const {
    linkToken,
    transactions,
    loading,
    isConnected,
    checkingStatus,
    transactionsLoading,
    onLinkSuccess,
    refreshTransactions,
    disconnect,
    isDisconnecting,
  } = usePlaid();
  const { getToken } = useAuth();

  const linkOptions = useMemo(
    () => ({
      token: linkToken ?? "",
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    }),
    [linkToken, onLinkSuccess]
  );

  const { open, ready } = usePlaidLink(linkOptions);

  if (checkingStatus) {
    return (
      <div className="font-sans min-h-screen p-8 flex flex-col items-center gap-8">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen p-8 flex flex-col items-center gap-8">
      <h1 className="text-2xl font-semibold">
        {isConnected
          ? "Your Transactions"
          : "Connect a bank and view transactions"}
      </h1>

      <div className="flex gap-4">
        {!isConnected && (
          <button
            className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
            disabled={!ready || !linkToken || loading}
            onClick={() => open()}
          >
            {loading ? "Loading..." : "Connect bank"}
          </button>
        )}
        {isConnected && (
          <>
            <button
              className="rounded-md border px-4 py-2"
              onClick={() => refreshTransactions()}
            >
              Refresh transactions
            </button>
            <button
              className="rounded-md border border-red-500/50 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
            > 
              {isDisconnecting ? "Disconnecting..." : "Disconnect Account"}
            </button>
          </>
        )}
      </div>

      {isConnected && !transactions?.length && !transactionsLoading && (
        <p className="text-gray-500">
          No transactions found. Try refreshing or check your account.
        </p>
      )}

      {!isConnected && !transactions?.length && (
        <p className="text-gray-500">
          Connect your bank account to view transactions.
        </p>
      )}

      {transactionsLoading && (
        <div className="w-full max-w-2xl">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="divide-y rounded-md border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 flex justify-between">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!!transactions?.length && !transactionsLoading && (
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-medium mb-2">Recent transactions</h2>
          <ul className="divide-y rounded-md border">
            {transactions.map((tx: any) => {
              const isPending = tx.status === "pending";
              const displayAmount = -tx.amount;
              const amountColor =
                displayAmount > 0 ? "text-green-600" : "text-red-600";

              return (
                <li
                  key={tx.transaction_id}
                  className={cn(
                    "p-3 flex justify-between items-center",
                    isPending && "opacity-60"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {tx.name || "Transaction"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {tx.date} {isPending && "(Pending)"}
                    </span>
                  </div>
                  <span className={cn("font-mono font-semibold", amountColor)}>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: tx.iso_currency_code || "USD",
                    }).format(displayAmount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

```

`apps/frontend/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return <SignIn redirectUrl="/" afterSignInUrl="/" />;
}

```

`apps/frontend/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return <SignUp redirectUrl="/" afterSignUpUrl="/" />;
}

```

`apps/frontend/src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.21 0.006 285.885);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.552 0.016 285.938);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}

```

`apps/frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

```

`apps/frontend/src/components/providers.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

```

`apps/frontend/src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }

```

`apps/frontend/src/lib/api.ts`:

```ts
import { treaty } from "@elysiajs/eden";
import type { App } from "@backend/index";

export const eden = treaty<App>(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
);

```

`apps/frontend/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

`apps/frontend/src/middleware.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) return;
  auth.protect();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/"],
};

```

`apps/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@backend/*": ["../backend/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```