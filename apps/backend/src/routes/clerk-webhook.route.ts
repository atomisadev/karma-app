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
      onboardingCompleted: false,
      budgets: {},
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
