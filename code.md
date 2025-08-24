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
│   │   ├── data
│   │   │   └── merchants.json
│   │   ├── index.ts
│   │   ├── plugin
│   │   │   └── clerk.ts
│   │   ├── routes
│   │   │   ├── clerk-webhook.route.ts
│   │   │   ├── cohere.route.ts
│   │   │   ├── plaid-webhook.route.ts
│   │   │   ├── plaid.route.ts
│   │   │   └── user.route.ts
│   │   ├── schemas
│   │   │   ├── plaid.schema.ts
│   │   │   ├── transaction.schema.ts
│   │   │   └── user.schema.ts
│   │   └── services
│   │       ├── cohere.service.ts
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
    │   │   │   │   ├── use-plaid.ts
    │   │   │   │   └── use-user.ts
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
    │   │   ├── layout.tsx
    │   │   └── onboarding
    │   │       └── page.tsx
    │   ├── components
    │   │   ├── Score.tsx
    │   │   ├── providers.tsx
    │   │   ├── theme-provider.tsx
    │   │   └── ui
    │   │       ├── alert.tsx
    │   │       ├── button.tsx
    │   │       ├── card.tsx
    │   │       ├── dialog.tsx
    │   │       ├── input.tsx
    │   │       ├── scroll-area.tsx
    │   │       ├── skeleton.tsx
    │   │       ├── sonner.tsx
    │   │       └── tabs.tsx
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
    "cohere-ai": "^7.18.1",
    "elysia": "^1.3.15",
    "elysia-clerk": "^0.12.1",
    "mongodb": "^6.18.0",
    "openai": "^5.15.0",
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
  COHERE_API_KEY: z.string().min(1),
  COHERE_MODEL_ID: z.string().min(1),
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
  COHERE_API_KEY: process.env.COHERE_API_KEY,
  COHERE_MODEL_ID: process.env.COHERE_MODEL_ID,
});

```

`apps/backend/src/data/merchants.json`:

```json
[
  {
    "name": "Starbucks",
    "category": ["Food and Drink", "Coffee Shop"],
    "amountRange": [4, 25]
  },
  {
    "name": "Dunkin'",
    "category": ["Food and Drink", "Coffee Shop"],
    "amountRange": [3, 20]
  },
  {
    "name": "McDonald's",
    "category": ["Food and Drink", "Fast Food"],
    "amountRange": [5, 30]
  },
  {
    "name": "Subway",
    "category": ["Food and Drink", "Fast Food"],
    "amountRange": [8, 25]
  },
  {
    "name": "Chipotle Mexican Grill",
    "category": ["Food and Drink", "Restaurants"],
    "amountRange": [10, 40]
  },
  {
    "name": "The Cheesecake Factory",
    "category": ["Food and Drink", "Restaurants"],
    "amountRange": [40, 200]
  },
  {
    "name": "Olive Garden",
    "category": ["Food and Drink", "Restaurants"],
    "amountRange": [30, 150]
  },
  {
    "name": "Uber Eats",
    "category": ["Food and Drink", "Delivery"],
    "amountRange": [15, 100]
  },
  {
    "name": "DoorDash",
    "category": ["Food and Drink", "Delivery"],
    "amountRange": [15, 100]
  },
  {
    "name": "Grubhub",
    "category": ["Food and Drink", "Delivery"],
    "amountRange": [15, 100]
  },
  {
    "name": "Local Pub",
    "category": ["Food and Drink", "Bar"],
    "amountRange": [20, 120]
  },
  {
    "name": "Whole Foods Market",
    "category": ["Groceries"],
    "amountRange": [20, 300]
  },
  {
    "name": "Trader Joe's",
    "category": ["Groceries"],
    "amountRange": [20, 250]
  },
  { "name": "Kroger", "category": ["Groceries"], "amountRange": [15, 350] },
  { "name": "Safeway", "category": ["Groceries"], "amountRange": [15, 300] },
  {
    "name": "Costco",
    "category": ["Groceries", "Shops"],
    "amountRange": [50, 700]
  },
  { "name": "H-E-B", "category": ["Groceries"], "amountRange": [20, 400] },
  {
    "name": "Amazon.com*Purchase",
    "category": ["Shops", "Online"],
    "amountRange": [10, 800]
  },
  {
    "name": "Target",
    "category": ["Shops", "General"],
    "amountRange": [10, 400]
  },
  {
    "name": "Walmart",
    "category": ["Shops", "General"],
    "amountRange": [10, 400]
  },
  {
    "name": "Best Buy",
    "category": ["Shops", "Electronics"],
    "amountRange": [25, 1500]
  },
  {
    "name": "Apple Store",
    "category": ["Shops", "Electronics"],
    "amountRange": [1, 3000]
  },
  {
    "name": "The Home Depot",
    "category": ["Shops", "Home Improvement"],
    "amountRange": [15, 1000]
  },
  {
    "name": "Lowe's",
    "category": ["Shops", "Home Improvement"],
    "amountRange": [15, 1000]
  },
  {
    "name": "Macy's",
    "category": ["Shops", "Department Store"],
    "amountRange": [20, 500]
  },
  {
    "name": "Nordstrom",
    "category": ["Shops", "Department Store"],
    "amountRange": [50, 1200]
  },
  {
    "name": "IKEA",
    "category": ["Shops", "Home Goods"],
    "amountRange": [30, 900]
  },
  { "name": "Etsy", "category": ["Shops", "Online"], "amountRange": [10, 200] },
  {
    "name": "Nike",
    "category": ["Shops", "Clothing"],
    "amountRange": [50, 400]
  },
  {
    "name": "Sephora",
    "category": ["Shops", "Beauty"],
    "amountRange": [20, 300]
  },
  {
    "name": "Uber",
    "category": ["Travel", "Rideshare"],
    "amountRange": [8, 70]
  },
  {
    "name": "Lyft",
    "category": ["Travel", "Rideshare"],
    "amountRange": [8, 70]
  },
  {
    "name": "Delta Airlines",
    "category": ["Travel", "Airlines"],
    "amountRange": [150, 2000]
  },
  {
    "name": "American Airlines",
    "category": ["Travel", "Airlines"],
    "amountRange": [150, 2000]
  },
  {
    "name": "United Airlines",
    "category": ["Travel", "Airlines"],
    "amountRange": [150, 2000]
  },
  {
    "name": "Marriott Hotels",
    "category": ["Travel", "Hotels"],
    "amountRange": [100, 1200]
  },
  {
    "name": "Hilton Hotels",
    "category": ["Travel", "Hotels"],
    "amountRange": [100, 1200]
  },
  {
    "name": "Airbnb",
    "category": ["Travel", "Lodging"],
    "amountRange": [80, 2500]
  },
  {
    "name": "Hertz",
    "category": ["Travel", "Car Rental"],
    "amountRange": [50, 600]
  },
  {
    "name": "NJ Transit",
    "category": ["Travel", "Public Transit"],
    "amountRange": [2.75, 50]
  },
  {
    "name": "Verizon Wireless",
    "category": ["Bills & Utilities", "Mobile Phone"],
    "amountRange": [50, 250]
  },
  {
    "name": "AT&T",
    "category": ["Bills & Utilities", "Mobile Phone"],
    "amountRange": [50, 250]
  },
  {
    "name": "Comcast Xfinity",
    "category": ["Bills & Utilities", "Internet"],
    "amountRange": [50, 150]
  },
  {
    "name": "Con Edison",
    "category": ["Bills & Utilities", "Electricity"],
    "amountRange": [40, 300]
  },
  {
    "name": "PSEG",
    "category": ["Bills & Utilities", "Gas & Electric"],
    "amountRange": [60, 400]
  },
  {
    "name": "City Water",
    "category": ["Bills & Utilities", "Water"],
    "amountRange": [30, 100]
  },
  {
    "name": "Geico",
    "category": ["Bills & Utilities", "Insurance"],
    "amountRange": [100, 400]
  },
  {
    "name": "CVS Pharmacy",
    "category": ["Health & Wellness", "Pharmacy"],
    "amountRange": [5, 150]
  },
  {
    "name": "Walgreens",
    "category": ["Health & Wellness", "Pharmacy"],
    "amountRange": [5, 150]
  },
  {
    "name": "Planet Fitness",
    "category": ["Health & Wellness", "Gym"],
    "amountRange": [10, 40]
  },
  {
    "name": "Equinox",
    "category": ["Health & Wellness", "Gym"],
    "amountRange": [200, 300]
  },
  {
    "name": "Doctor's Office Co-pay",
    "category": ["Health & Wellness", "Medical"],
    "amountRange": [20, 100]
  },
  {
    "name": "Zocdoc",
    "category": ["Health & Wellness", "Medical"],
    "amountRange": [50, 300]
  },
  {
    "name": "Netflix",
    "category": ["Entertainment", "Streaming"],
    "amountRange": [9.99, 22.99]
  },
  {
    "name": "Spotify",
    "category": ["Entertainment", "Streaming"],
    "amountRange": [10.99, 16.99]
  },
  {
    "name": "Hulu",
    "category": ["Entertainment", "Streaming"],
    "amountRange": [7.99, 17.99]
  },
  {
    "name": "Disney+",
    "category": ["Entertainment", "Streaming"],
    "amountRange": [7.99, 13.99]
  },
  {
    "name": "AMC Theatres",
    "category": ["Entertainment", "Movies"],
    "amountRange": [15, 80]
  },
  {
    "name": "Ticketmaster",
    "category": ["Entertainment", "Concerts"],
    "amountRange": [50, 500]
  },
  {
    "name": "Steam Games",
    "category": ["Entertainment", "Gaming"],
    "amountRange": [5, 100]
  },
  {
    "name": "Playstation Network",
    "category": ["Entertainment", "Gaming"],
    "amountRange": [10, 70]
  },
  {
    "name": "Barnes & Noble",
    "category": ["Entertainment", "Books"],
    "amountRange": [10, 100]
  },
  {
    "name": "Shell Gas Station",
    "category": ["Transportation", "Gas"],
    "amountRange": [30, 80]
  },
  {
    "name": "ExxonMobil",
    "category": ["Transportation", "Gas"],
    "amountRange": [30, 80]
  },
  {
    "name": "Jiffy Lube",
    "category": ["Transportation", "Car Maintenance"],
    "amountRange": [50, 300]
  },
  {
    "name": "EZ-Pass Toll",
    "category": ["Transportation", "Tolls"],
    "amountRange": [1.5, 20]
  },
  {
    "name": "Parking Garage",
    "category": ["Transportation", "Parking"],
    "amountRange": [10, 50]
  },
  {
    "name": "ATM Withdrawal",
    "category": ["Financial", "Cash"],
    "amountRange": [20, 200]
  },
  {
    "name": "Bank of America Fee",
    "category": ["Financial", "Bank Fee"],
    "amountRange": [5, 35]
  },
  {
    "name": "Coinbase",
    "category": ["Financial", "Investment"],
    "amountRange": [50, 1000]
  },
  {
    "name": "Robinhood",
    "category": ["Financial", "Investment"],
    "amountRange": [50, 1000]
  },
  {
    "name": "Zelle Transfer",
    "category": ["Transfer", "Payment"],
    "amountRange": [50, 2500]
  },
  {
    "name": "Venmo Payment",
    "category": ["Transfer", "Payment"],
    "amountRange": [5, 200]
  },
  {
    "name": "Cash App",
    "category": ["Transfer", "Payment"],
    "amountRange": [5, 200]
  },
  {
    "name": "Rent Payment",
    "category": ["Home", "Rent"],
    "amountRange": [1500, 4000]
  }
]

```

`apps/backend/src/index.ts`:

```ts
import { app as baseApp } from "./app";

import { plaidRoutes } from "./routes/plaid.route";
import { clerkWebhookRoutes } from "./routes/clerk-webhook.route";
import { connectToDb } from "./services/mongo.service";
import { plaidWebhookRoutes } from "./routes/plaid-webhook.route";
import { userRoutes } from "./routes/user.route";
import { cohereRoutes } from "./routes/cohere.route";

await connectToDb();

const app = baseApp
  .get("/", () => ({ message: "Hello from Elysia!" }))
  .use(plaidRoutes)
  .use(userRoutes)
  .use(cohereRoutes)
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
} from "../schemas/user.schema";

export const clerkWebhookRoutes = new Elysia({ prefix: "/webhook" }).post(
  "/clerk",
  async ({ request, set }: { request: Request; set: any }) => {
    try {
      const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET);

      const svixId = request.headers.get("svix-id");
      const svixTimestamp = request.headers.get("svix-timestamp");
      const svixSignature = request.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        set.status = 400;
        return { error: "Missing svix headers" };
      }

      const payload = await request.text();

      let event: unknown;
      try {
        event = webhook.verify(payload, {
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
  },
  { type: "none" }
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
      onboardingCompleted: false,
      budgets: {},
      karmaScore: 500,
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

`apps/backend/src/routes/cohere.route.ts`:

```ts
import { getFinancialInsight } from "@backend/services/cohere.service";
import type { App } from "../app";

export const cohereRoutes = (app: App) =>
  app.group("/api/openai", (group) =>
    group.post(
      "/insight",
      async ({ request, requireAuth, set }) => {
        const userId = requireAuth();

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          set.status = 400;
          return { error: "Invalid body" };
        }

        const prompt = (body as any)?.prompt;
        if (typeof prompt !== "string" || prompt.length === 0) {
          set.status = 400;
          return { error: "Invalid body" };
        }

        try {
          const insight = await getFinancialInsight(prompt);
          return insight;
        } catch (error) {
          set.status = 500;
          return { error: (error as Error).message };
        }
      },
      { type: "none" }
    )
  );

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
import { processNewTransactionForKarma } from "@backend/services/transaction.service";
import { ObjectId } from "mongodb";

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
        case "SYNC_UPDATES_AVAILABLE": {
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

              // Process each added/modified transaction for challenge/karma in near-realtime
              const incoming = [...data.added, ...data.modified];
              for (const tx of incoming) {
                const txDoc: Transaction = {
                  _id: new ObjectId(),
                  clerkId: user.clerkId,
                  plaidTransactionId: tx.transaction_id,
                  plaidAccountId: tx.account_id,
                  amount: tx.amount,
                  date: tx.date,
                  name: tx.name,
                  paymentChannel: tx.payment_channel || "other",
                  category: tx.category || undefined,
                  isoCurrencyCode: tx.iso_currency_code || "USD",
                  status: tx.pending ? "pending" : "cleared",
                } as Transaction;

                await processNewTransactionForKarma(user.clerkId, txDoc);
              }
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
        }
        case "TRANSACTIONS_REMOVED": {
          // No-op
          break;
        }
        default: {
          break;
        }
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
import { Elysia, t } from "elysia";
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
import { processNewTransactionForKarma } from "@backend/services/transaction.service";
import { ObjectId } from "mongodb";

export const plaidRoutes = (app: App) =>
  app.group("/api/plaid", (group) =>
    group
      .post("/createLinkToken", async ({ requireAuth }) => {
        const userId = requireAuth();
        const res = await createLinkToken({ userId: userId });
        return res;
      })
      .post(
        "/exchangePublicToken",
        async ({ request, set, requireAuth }) => {
          const userId = requireAuth();

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            set.status = 400;
            return { error: "Invalid body" };
          }

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
        },
        { type: "none" }
      )
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
        async ({ request, set, requireAuth }) => {
          const userId = requireAuth();

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            set.status = 400;
            return { ok: false, error: "Invalid body" };
          }

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
              category: [t.description.split(" ")[0]],
              isoCurrencyCode: t.isoCurrencyCode || "USD",
              status: "pending" as const,
            }));

            if (documents.length > 0) {
              await transactionsCollection.insertMany(documents as any);
              console.log(
                `Successfully created ${documents.length} manual transactions.`
              );

              for (const doc of documents) {
                await processNewTransactionForKarma(userId, {
                  ...doc,
                  _id: new ObjectId(),
                });
              }
            }

            return { ok: true };
          } catch (error) {
            console.error("Error creating manual transactions:", error);
            set.status = 500;
            return { ok: false, error: "Internal server error" };
          }
        },
        { type: "none" }
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

`apps/backend/src/routes/user.route.ts`:

```ts
import { Elysia } from "elysia";
import { z } from "zod";
import type { App } from "../app";
import { getDb } from "../services/mongo.service";
import type { User } from "../schemas/user.schema";
import { replaceWithSeedTransactions } from "../services/transaction.service";
import { disconnectPlaidItem } from "../services/plaid.service";
import { request } from "http";

const BudgetsSchema = z.record(z.string(), z.number());

export const userRoutes = (app: App) =>
  app.group("/api/user", (group) =>
    group
      .get("/me", async ({ requireAuth, set }) => {
        const userId = requireAuth();
        const db = getDb();
        const users = db.collection<User>("users");
        const user = await users.findOne(
          { clerkId: userId },
          { projection: { _id: 0 } }
        );
        if (!user) {
          set.status = 404;
          return { error: "User not found" };
        }
        return {
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          onboardingCompleted: user.onboardingCompleted ?? false,
          budgets: user.budgets ?? {},
          karmaScore: user.karmaScore ?? 500,
          activeChallenge: user.activeChallenge ?? null,
        };
      })
      .patch("/budgets", async ({ body, set, requireAuth }) => {
        const userId = requireAuth();
        const parsed = z.object({ budgets: BudgetsSchema }).safeParse(body);
        if (!parsed.success) {
          set.status = 400;
          return { ok: false, error: "Invalid body" };
        }
        const db = getDb();
        const users = db.collection<User>("users");
        await users.updateOne(
          { clerkId: userId },
          {
            $set: {
              budgets: parsed.data.budgets,
              updatedAt: new Date(),
            },
          }
        );
        return { ok: true };
      })
      .post("/onboarding/complete", async ({ request, set, requireAuth }) => {
        const userId = requireAuth();

        let body: unknown = {};
        try {
          if (request.body) {
            body = await request.json();
          }
        } catch (error) {
          // no need for logging parsing errors for empty body is not necessary
        }

        const parsed = z
          .object({ budgets: BudgetsSchema.optional() })
          .safeParse(body ?? {});
        if (!parsed.success) {
          set.status = 400;
          return { ok: false, error: "Invalid body" };
        }
        const db = getDb();
        const users = db.collection<User>("users");
        const $set: Partial<User> = {
          onboardingCompleted: true,
          updatedAt: new Date(),
        };
        if (parsed.data.budgets) {
          $set.budgets = parsed.data.budgets;
        }
        await users.updateOne({ clerkId: userId }, { $set });
        return { ok: true };
      })
      .post("/useSeedTransactions", async ({ requireAuth, set }) => {
        try {
          const userId = requireAuth();
          await disconnectPlaidItem({ userId });
          const res = await replaceWithSeedTransactions(userId);
          return res;
        } catch (err) {
          console.error("Error switching to seeded transactions:", err);
          set.status = 500;
          return { ok: false, error: "Internal server error" };
        }
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
  onboardingCompleted: z.boolean().default(false),
  budgets: z.record(z.string(), z.number()).default({}),
  seededTransactionsAt: z.date().optional(),
  karmaScore: z.number().default(500),
  activeChallenge: z
    .object({
      instruction: z.string(),
      dateSet: z.date(),
    })
    .optional(),
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

`apps/backend/src/services/cohere.service.ts`:

```ts
import { CohereClient } from "cohere-ai";
import { env } from "@backend/config";
import type { Transaction } from "@backend/schemas/transaction.schema";

const cohere = new CohereClient({
  token: env.COHERE_API_KEY,
});

export async function getFinancialInsight(inputPrompt: string) {
  try {
    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a helpful and expert financial assistant. Analyze the user's financial data and provide concise, actionable insights. Your tone should be encouraging. If the user asks for a budget in JSON format, you must respond with ONLY the valid JSON object and nothing else.",
      message: inputPrompt,
    });

    if (!response.text) {
      throw new Error("No output text received from Cohere");
    }

    return { insight: response.text };
  } catch (error) {
    console.error("Error calling Cohere API:", error);
    throw new Error("Failed to generate financial insight.");
  }
}

export async function isIndulgence(
  transactionName: string,
  transactionCategory: string[] | undefined
): Promise<boolean> {
  try {
    const prompt = `Is the following transaction typically considered an "indulgence" or a non-essential purchase? Indulgent purchases can range anywhere from travel purchases, clothing, electronics, dining out, snacks and treats, hobbies and media, live events, beauty and wellness, fitness.
    Transaction Name: ${transactionName}
    Category: ${transactionCategory?.join(", ") || "N/A"}
    Answer with only "yes" or "no" in lowercase, without any other text or punctuation.`;
    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a highly specialized AI for classifying financial transactions. Your only output is 'yes' or 'no'.",
      message: prompt,
    });
    const classification = response.text?.trim().toLowerCase();
    return classification === "yes";
  } catch (error) {
    console.error("Error classifying transaction as indulgence:", error);
    return false;
  }
}

export async function getSuggestedChallengeInstruction(
  recentTransactions: Transaction[],
  indulgentTransaction: Transaction
): Promise<string | null> {
  try {
    const indulgenceName = indulgentTransaction.name;

    const prompt = `A user just made an indulgent purchase: "${indulgenceName}".
    Based on this, create a direct, one-sentence challenge to help them save money **tomorrow**.

    Your response must follow this structure: "Since you recently spent on {indulgence}, your challenge for tomorrow is to {actionable goal}." The goal should be about **avoiding** a certain type of spending.

    Examples:
    - Indulgence: "AMC Theatres Ticket" -> "Since you recently spent on a movie, your challenge for tomorrow is to avoid dining out or ordering takeout."
    - Indulgence: "Starbucks" -> "Since you recently spent on coffee, your challenge for tomorrow is to avoid buying drinks from cafes."

    Respond with ONLY the single challenge sentence, without any quotation marks.`;

    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a financial coach. Your task is to analyze a transaction and suggest a justified, one-sentence challenge for the user to complete tomorrow. You must follow the user's required format exactly.",
      message: prompt,
    });

    // Clean the response to remove quotes, just in case.
    return response.text?.trim().replace(/^"|"$/g, "") || null;
  } catch (error) {
    console.error("Error getting challenge suggestion:", error);
    return null;
  }
}

export async function doesTransactionMatchCategory(
  transactionName: string,
  categoryName: string
): Promise<boolean> {
  try {
    const prompt = `Does the transaction "${transactionName}" fall under the general spending category of "${categoryName}"? Answer only "yes" or "no".`;
    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a transaction classifier. Your only output is 'yes' or 'no'.",
      message: prompt,
    });
    return response.text?.trim().toLowerCase() === "yes";
  } catch (error) {
    console.error("Error matching transaction to category:", error);
    return false;
  }
}

export async function doesTransactionViolateInstruction(
  instruction: string,
  tx: Transaction
): Promise<boolean> {
  try {
    const name = tx.name;
    const category = tx.category?.join(", ") || "N/A";
    const amount = tx.amount;
    const channel = tx.paymentChannel;

    const prompt = `You are judging whether a financial transaction violates the user's challenge instruction.
Challenge (natural language): ${instruction}

Transaction details:
- Name: ${name}
- Category: ${category}
- Amount: ${amount}
- Channel: ${channel}

Rules:
- Consider the semantic meaning of the transaction relative to the challenge.
- If the transaction reasonably fits what the challenge asks to avoid, output "violation".
- Otherwise output "pass".
- Output ONLY one word: "violation" or "pass".`;

    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You judge if a transaction violates a challenge instruction. Output only 'violation' or 'pass'.",
      message: prompt,
    });

    const out = response.text?.trim().toLowerCase();
    return out === "violation";
  } catch (error) {
    console.error("Error checking violation against instruction:", error);
    return false;
  }
}

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
import { type User } from "../schemas/user.schema";
import type { Transaction } from "@backend/schemas/transaction.schema";
import { env } from "@backend/config";
import { replaceWithSeedTransactions } from "./transaction.service";

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

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

  await replaceWithSeedTransactions(userId);

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
  const db = getDb();
  const transactionsCollection = db.collection<Transaction>("transactions");

  const clearedDate = daysAgo(2);
  const result = await transactionsCollection.updateMany(
    { clerkId: userId, status: "pending", date: { $lte: clearedDate } },
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
    connectedAt: user?.plaidConnectedAt ?? user?.seededTransactionsAt,
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
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.13",
    "@tanstack/react-query": "^5.85.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.541.0",
    "next": "15.5.0",
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-icons": "^5.5.0",
    "react-plaid-link": "^4.1.1",
    "sonner": "^2.0.7",
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

`apps/frontend/src/app/(app)/_hooks/use-user.ts`:

```ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth();
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      const res = await eden.api.user.me.get({
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: isSignedIn,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const prevKarmaRef = useRef<number | null>(null);
  const prevChallengeRef = useRef(me?.activeChallenge ?? null);

  useEffect(() => {
    if (me) {
      const currentKarma = me.karmaScore ?? null;
      const currentChallenge = me.activeChallenge ?? null;

      const prevKarma = prevKarmaRef.current;
      const prevChallenge = prevChallengeRef.current;

      if (
        prevChallenge &&
        !currentChallenge &&
        prevKarma != null &&
        currentKarma != null &&
        currentKarma < prevKarma
      ) {
        toast.error("Challenge failed", {
          description: `You lost 25 karma points.`,
          duration: 6000,
        });
      }

      prevKarmaRef.current = currentKarma;
      prevChallengeRef.current = currentChallenge;
    }
  }, [me?.karmaScore, me?.activeChallenge]);

  const saveBudgets = useMutation({
    mutationFn: async (budgets: Record<string, number>) => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      return eden.api.user.budgets.patch(
        { budgets },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  const completeOnboarding = useMutation({
    mutationFn: async (budgets?: Record<string, number>) => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      return eden.api.user.onboarding.complete.post(
        budgets ? { budgets } : undefined,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  return {
    me,
    loading: isLoading,
    saveBudgets,
    completeOnboarding,
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
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
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
import { eden } from "@/lib/api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = await getToken();
  if (token) {
    const res = await eden.api.user.me.get({
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = res.data as any;
    if (me && me.onboardingCompleted === false) {
      redirect("/onboarding");
    }
  }

  return children;
}

```

`apps/frontend/src/app/(app)/page.tsx`:

```tsx
"use client";

import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { useMemo, useState, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import Score from "../../components/Score";
import { useUserProfile } from "./_hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { FaRegTrashAlt } from "react-icons/fa";
import { HiOutlineRefresh } from "react-icons/hi";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

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
  const { me, saveBudgets } = useUserProfile();

  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [previousBudgets, setPreviousBudgets] = useState<Record<
    string,
    number
  > | null>(null);

  useEffect(() => {
    if (me?.budgets) {
      setBudgets(me.budgets);
    }
  }, [me?.budgets]);

  const linkOptions = useMemo(
    () => ({
      token: linkToken ?? "",
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    }),
    [linkToken, onLinkSuccess]
  );

  const { open, ready } = usePlaidLink(linkOptions);

  const last30Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const income30 = useMemo(() => {
    const clearedRecent =
      transactions?.filter(
        (t: any) => t.status === "cleared" && t.date >= last30Days
      ) || [];
    const incomes = clearedRecent.filter(
      (t: any) => t.name === "Monthly Salary Deposit"
    );
    return incomes.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  }, [transactions, last30Days]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    (transactions || [])
      .filter(
        (t: any) =>
          t.status === "cleared" && t.amount > 0 && t.date >= last30Days
      )
      .forEach((t: any) => {
        const top = t.category?.[0] ?? "Other";
        map.set(top, (map.get(top ?? 0) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .reduce<Record<string, number>>((acc, [k, v]) => ((acc[k] = v), acc), {});
  }, [transactions, last30Days]);

  const aiSuggestionMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const { data, error } = await eden.api.openai.insight.post(
        { prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (error) throw error.value;
      return data;
    },
    onSuccess: (data) => {
      if (data && "insight" in data) {
        try {
          let jsonString = data.insight.trim();
          if (jsonString.startsWith("```json")) {
            jsonString = jsonString
              .replace(/^```json\s*/, "")
              .replace(/```$/, "");
          }

          const suggestedBudgets = JSON.parse(jsonString);
          setBudgets(suggestedBudgets);
          setHasChanges(true);
          toast.success("AI budget recommendations applied!");
        } catch (e) {
          console.error("Failed to parse AI response:", e);
          toast.error("The AI returned an invalid response. Please try again.");
        }
      } else if (data && "error" in data) {
        console.error("AI suggestion error:", data.error);
        toast.error(`An error occurred: ${data.error}`);
      }
    },
  });

  const handleGetAiSuggestions = () => {
    setPreviousBudgets(budgets);
    const categories = Object.keys(categoryTotals).join(", ");
    const prompt = `My monthly income is ${formatCurrency(
      income30
    )}. My spending categories from the last month are: ${categories}. Please provide a recommended monthly budget for each of these categories as a JSON object, where keys are the category names and values are the budget amounts as numbers. The total budget should be less than my income.`;
    aiSuggestionMutation.mutate(prompt);
  };

  const handleBudgetChange = (category: string, value: string) => {
    setBudgets((prev) => ({
      ...prev,
      [category]: Number(value || 0),
    }));
    setHasChanges(true);
    setPreviousBudgets(null);
  };

  const handleSaveBudgets = () => {
    saveBudgets.mutate(budgets, {
      onSuccess: () => {
        setHasChanges(false);
        setPreviousBudgets(null);
        toast.success("Budgets saved successfully!");
      },
    });
  };

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
    <div className="w-full">
      {!isConnected && (
        <div className="flex w-full justify-center items-center h-screen text-center">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>
                <h1 className="text-2xl font-semibold text-center">
                  Connect a bank and view transactions
                </h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                disabled={!ready || !linkToken || loading}
                onClick={() => open()}
              >
                {loading ? "Loading..." : "Connect bank"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-4 fixed">
        <UserButton />
      </div>

      <div className="flex flex-col md:flex-row justify-end items-center w-full font-sans gap-8 p-6 h-screen">
        <div className="flex flex-col items-center w-full md:w-1/2">
          {isConnected && !transactionsLoading && (
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold">Karma Score</h2>
              <Score score={me?.karmaScore} size={400} />
            </div>
          )}
          {me?.activeChallenge && (
            <div className="flex justify-center items-center p-2">
              <Alert className="w-full max-w-xl">
                <AlertCircleIcon />
                <AlertTitle>
                  <p className="font-bold">Heads up!</p>
                </AlertTitle>
                <AlertDescription>
                  {me.activeChallenge.instruction ??
                    `Try to avoid ${me.activeChallenge.instruction} tomorrow to boost your Karma Score.`}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-start gap-8 h-full">
          <Tabs defaultValue="budgets" className="w-full flex flex-col h-full">
            <TabsList className="w-full max-w-2xl mb-4 flex-shrink-0">
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent
              value="budgets"
              className="flex flex-col flex-1 overflow-hidden"
            >
              <Card className="w-full max-w-2xl flex flex-col h-full">
                <CardHeader>
                  <CardTitle>
                    <div className="flex gap-4 flex-row justify-between items-center">
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">
                          Monthly Income
                        </p>
                        <p className="text-3xl font-bold">
                          {formatCurrency(income30)}
                        </p>
                      </div>
                      <div className="flex flex-row gap-2">
                        {isConnected && (
                          <Button
                            variant="destructive"
                            onClick={() => disconnect()}
                            disabled={isDisconnecting}
                          >
                            <FaRegTrashAlt />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">Your Budgets</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleGetAiSuggestions}
                        disabled={aiSuggestionMutation.isPending}
                        size="sm"
                      >
                        ✨{" "}
                        {aiSuggestionMutation.isPending
                          ? "Thinking..."
                          : "Ask AI"}
                      </Button>
                      <Button
                        onClick={handleSaveBudgets}
                        disabled={!hasChanges || saveBudgets.isPending}
                        size="sm"
                      >
                        {saveBudgets.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-3">
                      {Object.entries(categoryTotals).map(
                        ([category, total]) => (
                          <div key={category}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">{category}</span>
                              <Input
                                type="number"
                                value={budgets[category] ?? ""}
                                onChange={(e) =>
                                  handleBudgetChange(category, e.target.value)
                                }
                                className="w-28"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="text-xs text-muted-foreground text-right flex justify-end items-center gap-3">
                              {previousBudgets &&
                                previousBudgets[category] !== undefined && (
                                  <span className="italic">
                                    (was:{" "}
                                    {formatCurrency(previousBudgets[category])})
                                  </span>
                                )}
                              <span>Spent: {formatCurrency(total)}</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="transactions"
              className="flex flex-col flex-1 overflow-hidden"
            >
              <Card className="w-full max-w-2xl flex flex-col h-full">
                <CardHeader className="flex-shrink-0">
                  <CardTitle>
                    <div className="flex gap-4 flex-row justify-between items-center">
                      <p>Recent transactions</p>
                      <div className="flex flex-row gap-2">
                        {isConnected && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => refreshTransactions()}
                            >
                              <HiOutlineRefresh />
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => disconnect()}
                              disabled={isDisconnecting}
                            >
                              <FaRegTrashAlt />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 overflow-hidden">
                  {!transactions?.length ? (
                    <p className="text-muted-foreground text-center">
                      No transactions found. Try refreshing or check your
                      account.
                    </p>
                  ) : (
                    <ScrollArea className="flex-1 w-full rounded-md border overflow-y-auto">
                      <ul className="divide-y">
                        {transactions.map((tx: any) => {
                          const isPending = tx.status === "pending";
                          const displayAmount = -tx.amount;
                          const amountColor =
                            displayAmount > 0
                              ? "text-green-600"
                              : "text-red-600";

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
                                <span className="text-sm text-muted-foreground">
                                  {tx.date} {isPending && "(Pending)"}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "font-mono font-semibold",
                                  amountColor
                                )}
                              >
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: tx.iso_currency_code || "USD",
                                }).format(displayAmount)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

```

`apps/frontend/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
      <div className="flex w-full justify-center items-center h-screen text-center">
        <SignIn redirectUrl="/" afterSignInUrl="/" />
      </div>
    );
}

```

`apps/frontend/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex w-full justify-center items-center h-screen text-center">
      <SignUp redirectUrl="/" afterSignUpUrl="/" />
    </div>
  );
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
  --font-sans: Inter, sans-serif;
  --font-mono: JetBrains Mono, monospace;
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
  --font-serif: Merriweather, serif;
  --radius: 0.5rem;
  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
  --tracking-normal: var(--tracking-normal);
  --shadow-2xl: var(--shadow-2xl);
  --shadow-xl: var(--shadow-xl);
  --shadow-lg: var(--shadow-lg);
  --shadow-md: var(--shadow-md);
  --shadow: var(--shadow);
  --shadow-sm: var(--shadow-sm);
  --shadow-xs: var(--shadow-xs);
  --shadow-2xs: var(--shadow-2xs);
  --spacing: var(--spacing);
  --letter-spacing: var(--letter-spacing);
  --shadow-offset-y: var(--shadow-offset-y);
  --shadow-offset-x: var(--shadow-offset-x);
  --shadow-spread: var(--shadow-spread);
  --shadow-blur: var(--shadow-blur);
  --shadow-opacity: var(--shadow-opacity);
  --color-shadow-color: var(--shadow-color);
  --color-destructive-foreground: var(--destructive-foreground);
}

:root {
  --radius: 0.5rem;
  --background: oklch(0.9842 0.0034 247.8575);
  --foreground: oklch(0.2795 0.0368 260.0310);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.2795 0.0368 260.0310);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.2795 0.0368 260.0310);
  --primary: oklch(0.5854 0.2041 277.1173);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9276 0.0058 264.5313);
  --secondary-foreground: oklch(0.3729 0.0306 259.7328);
  --muted: oklch(0.9670 0.0029 264.5419);
  --muted-foreground: oklch(0.5510 0.0234 264.3637);
  --accent: oklch(0.9299 0.0334 272.7879);
  --accent-foreground: oklch(0.3729 0.0306 259.7328);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --border: oklch(0.8717 0.0093 258.3382);
  --input: oklch(0.8717 0.0093 258.3382);
  --ring: oklch(0.5854 0.2041 277.1173);
  --chart-1: oklch(0.5854 0.2041 277.1173);
  --chart-2: oklch(0.5106 0.2301 276.9656);
  --chart-3: oklch(0.4568 0.2146 277.0229);
  --chart-4: oklch(0.3984 0.1773 277.3662);
  --chart-5: oklch(0.3588 0.1354 278.6973);
  --sidebar: oklch(0.9670 0.0029 264.5419);
  --sidebar-foreground: oklch(0.2795 0.0368 260.0310);
  --sidebar-primary: oklch(0.5854 0.2041 277.1173);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9299 0.0334 272.7879);
  --sidebar-accent-foreground: oklch(0.3729 0.0306 259.7328);
  --sidebar-border: oklch(0.8717 0.0093 258.3382);
  --sidebar-ring: oklch(0.5854 0.2041 277.1173);
  --destructive-foreground: oklch(1.0000 0 0);
  --font-sans: Inter, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: JetBrains Mono, monospace;
  --shadow-color: hsl(0 0% 0%);
  --shadow-opacity: 0.1;
  --shadow-blur: 8px;
  --shadow-spread: -1px;
  --shadow-offset-x: 0px;
  --shadow-offset-y: 4px;
  --letter-spacing: 0em;
  --spacing: 0.25rem;
  --shadow-2xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 4px 6px -2px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 8px 10px -2px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
}

.dark {
  --background: oklch(0.2077 0.0398 265.7549);
  --foreground: oklch(0.9288 0.0126 255.5078);
  --card: oklch(0.2795 0.0368 260.0310);
  --card-foreground: oklch(0.9288 0.0126 255.5078);
  --popover: oklch(0.2795 0.0368 260.0310);
  --popover-foreground: oklch(0.9288 0.0126 255.5078);
  --primary: oklch(0.6801 0.1583 276.9349);
  --primary-foreground: oklch(0.2077 0.0398 265.7549);
  --secondary: oklch(0.3351 0.0331 260.9120);
  --secondary-foreground: oklch(0.8717 0.0093 258.3382);
  --muted: oklch(0.2795 0.0368 260.0310);
  --muted-foreground: oklch(0.7137 0.0192 261.3246);
  --accent: oklch(0.3729 0.0306 259.7328);
  --accent-foreground: oklch(0.8717 0.0093 258.3382);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --border: oklch(0.4461 0.0263 256.8018);
  --input: oklch(0.4461 0.0263 256.8018);
  --ring: oklch(0.6801 0.1583 276.9349);
  --chart-1: oklch(0.6801 0.1583 276.9349);
  --chart-2: oklch(0.5854 0.2041 277.1173);
  --chart-3: oklch(0.5106 0.2301 276.9656);
  --chart-4: oklch(0.4568 0.2146 277.0229);
  --chart-5: oklch(0.3984 0.1773 277.3662);
  --sidebar: oklch(0.2795 0.0368 260.0310);
  --sidebar-foreground: oklch(0.9288 0.0126 255.5078);
  --sidebar-primary: oklch(0.6801 0.1583 276.9349);
  --sidebar-primary-foreground: oklch(0.2077 0.0398 265.7549);
  --sidebar-accent: oklch(0.3729 0.0306 259.7328);
  --sidebar-accent-foreground: oklch(0.8717 0.0093 258.3382);
  --sidebar-border: oklch(0.4461 0.0263 256.8018);
  --sidebar-ring: oklch(0.6801 0.1583 276.9349);
  --destructive-foreground: oklch(0.2077 0.0398 265.7549);
  --radius: 0.5rem;
  --font-sans: Inter, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: JetBrains Mono, monospace;
  --shadow-color: hsl(0 0% 0%);
  --shadow-opacity: 0.1;
  --shadow-blur: 8px;
  --shadow-spread: -1px;
  --shadow-offset-x: 0px;
  --shadow-offset-y: 4px;
  --letter-spacing: 0em;
  --spacing: 0.25rem;
  --shadow-2xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 4px 6px -2px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 8px 10px -2px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.25);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    letter-spacing: var(--tracking-normal);
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
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

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
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

```

`apps/frontend/src/app/onboarding/page.tsx`:

```tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlaid } from "@/app/(app)/_hooks/use-plaid";
import { useUserProfile } from "@/app/(app)/_hooks/use-user";
import { useAuth } from "@clerk/nextjs";
import { usePlaidLink } from "react-plaid-link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Tx = {
  amount: number;
  date: string;
  name: string;
  category?: string[];
  status: "pending" | "cleared";
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    linkToken,
    onLinkSuccess,
    transactions,
    checkingStatus,
    isConnected,
    transactionsLoading,
  } = usePlaid();
  const { me, loading, completeOnboarding } = useUserProfile();

  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [showIncomeModal, setShowIncomeModal] = useState(true);

  useEffect(() => {
    if (me?.onboardingCompleted) {
      router.replace("/");
    }
  }, [me?.onboardingCompleted, router]);

  useEffect(() => {
    if (me?.budgets) setBudgets(me.budgets);
  }, [me?.budgets]);

  const linkOptions = useMemo(
    () => ({
      token: linkToken ?? "",
      onSuccess: (publicToken: string) => onLinkSuccess(publicToken),
    }),
    [linkToken, onLinkSuccess]
  );
  const { open, ready } = usePlaidLink(linkOptions);

  const last30Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const txs = (transactions ?? []) as Tx[];

  const income30 = useMemo(() => {
    const clearedRecent = txs.filter(
      (t) => t.status === "cleared" && t.date >= last30Days
    );
    const incomes = clearedRecent.filter(
      (t) => t.name === "Monthly Salary Deposit"
    );
    return incomes.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [txs, last30Days]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    txs
      .filter((t) => t.status === "cleared" && t.amount > 0)
      .forEach((t) => {
        const top = t.category?.[0] ?? "Other";
        map.set(top, (map.get(top) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .reduce<Record<string, number>>((acc, [k, v]) => ((acc[k] = v), acc), {});
  }, [txs]);

  const mergedBudgets = useMemo(() => {
    const b = { ...budgets };
    Object.keys(categoryTotals).forEach((k) => {
      if (b[k] == null) b[k] = Math.round(categoryTotals[k]);
    });
    return b;
  }, [budgets, categoryTotals]);

  const [saving, setSaving] = useState(false);
  const handleComplete = async () => {
    try {
      setSaving(true);
      await completeOnboarding.mutateAsync(mergedBudgets);
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  if (!isSignedIn) return null;

  const isLoading = checkingStatus || transactionsLoading || loading;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 max-w-3xl mx-auto flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Loading your data...</CardTitle>
            <CardDescription>
              Please wait while we fetch your transactions.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen p-8 max-w-3xl mx-auto flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle><h1 className="text-2xl font-semibold text-center">Welcome!</h1></CardTitle>
            <CardDescription>
              Connect your bank account to start your financial journey with Karma.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button disabled={!ready} onClick={() => open()}>
              Connect your bank
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <Dialog open={showIncomeModal} onOpenChange={setShowIncomeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Monthly Income</DialogTitle>
            <DialogDescription>
              This is the estimated total income from your transactions over the last 30 days.
            </DialogDescription>
          </DialogHeader>
          <p className="text-4xl font-bold text-center my-4">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(income30)}
          </p>
          <Button className="w-full" onClick={() => setShowIncomeModal(false)}>
            Yes, I understand
          </Button>
        </DialogContent>
      </Dialog>

      {!showIncomeModal && Object.keys(categoryTotals).length > 0 && (
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Set your budgets based on spending</CardTitle>
            <CardDescription>
              We’ve detected your spending categories from the last 30 days. You can set a monthly budget for each, or leave them as the default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-3">
                {Object.entries(categoryTotals).map(([cat, total]) => (
                  <div
                    key={cat}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border rounded-md p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-lg">{cat}</div>
                      <div className="text-sm text-muted-foreground">
                        Last 30 days:{" "}
                        <span className="font-bold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(total)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Budget</label>
                      <Input
                        type="number"
                        className="w-28 text-right"
                        value={mergedBudgets[cat] ?? 0}
                        onChange={(e) =>
                          setBudgets((prev) => ({
                            ...prev,
                            [cat]: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button
              className="w-full mt-4"
              disabled={saving}
              onClick={handleComplete}
            >
              {saving ? "Saving…" : "Save budgets and finish"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

```

`apps/frontend/src/components/Score.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

export type ScoreProps = {
  score?: number;
  size?: number;
};

const MIN_SCORE = 300;
const MAX_SCORE = 850;
const SWEEP_DEG = 180;
const START_ANGLE = -180;
const END_ANGLE = 0;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const scoreToRatio = (score: number) => {
  const t = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  return clamp(t, 0, 1);
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export default function Score({ score = 575, size = 460 }: ScoreProps) {
  const s = clamp(score, MIN_SCORE, MAX_SCORE);

  const ratio = scoreToRatio(s);
  const angle = START_ANGLE + ratio * SWEEP_DEG;

  const thickness = 30;
  const w = size;
  const r = (w - thickness) / 2.5;
  const cx = w / 2;
  const cy = r + thickness / 2;
  const h = r + thickness;

  const trackPath = useMemo(
    () => arcPath(cx, cy, r, START_ANGLE, END_ANGLE),
    [cx, cy, r]
  );
  const progressPath = useMemo(
    () => arcPath(cx, cy, r, START_ANGLE, angle),
    [cx, cy, r, angle]
  );

  const knob = polarToCartesian(cx, cy, r, angle);
  const knobR = Math.max(10, thickness * 0.6);

  return (
    <div className="w-full flex flex-col items-center gap-6 p-6">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="overflow-visible"
      >
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb6a"
          strokeWidth={thickness}
          strokeLinecap="round"
        />

        <path
          d={progressPath}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />

        <g>
          <circle
            cx={knob.x}
            cy={knob.y}
            r={knobR}
            fill="#ffffff"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.25))" }}
          />
          <circle
            cx={knob.x}
            cy={knob.y}
            r={knobR - 6}
            fill="#ffffff"
            stroke="#e5e7eb"
            strokeWidth={4}
          />
        </g>

        <text
          x={cx}
          y={cy - r / 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={48}
          fontWeight="600"
          fill="#111827"
        >
          {s}
        </text>
        <text
          x={cx}
          y={cy - r / 4 + 32}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fill="#6b7280"
        >
          {MIN_SCORE}–{MAX_SCORE}
        </text>

        <defs>
          <linearGradient
            id="progressGradient"
            gradientUnits="userSpaceOnUse"
            x1={cx - r}
            y1={cy}
            x2={cx + r}
            y2={cy}
          >
            <stop offset="0%" stopColor="oklch(0.5854 0.2041 277.1173)" />
            <stop offset="100%" stopColor="oklch(0.2795 0.0368 260.0310)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
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
            staleTime: 60 * 1000,
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

`apps/frontend/src/components/theme-provider.tsx`:

```tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

`apps/frontend/src/components/ui/alert.tsx`:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }

```

`apps/frontend/src/components/ui/button.tsx`:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

`apps/frontend/src/components/ui/card.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

```

`apps/frontend/src/components/ui/dialog.tsx`:

```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

```

`apps/frontend/src/components/ui/input.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```

`apps/frontend/src/components/ui/scroll-area.tsx`:

```tsx
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }

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

`apps/frontend/src/components/ui/sonner.tsx`:

```tsx
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

```

`apps/frontend/src/components/ui/tabs.tsx`:

```tsx
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-[#FFFFFFFF] text-foreground inline-flex h-9 w-fit items-center border border-2 border-[var(--accent)] justify-center rounded-lg py-[6px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-8 py-4 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

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

export default clerkMiddleware(
  (auth, req) => {
    if (isPublicRoute(req)) return;
    auth.protect();
  },
  {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }
);

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