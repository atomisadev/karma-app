import { MongoClient, Db } from "mongodb";
import { env } from "@backend/config";

let client: MongoClient | null = null;
let db: Db | null = null;

export const getDb = async () => {
  if (db) return db;

  if (!client) client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(env.MONGODB_DB);
  return db;
};

export const closeDb = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};
