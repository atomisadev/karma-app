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
