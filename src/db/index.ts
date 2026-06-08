// Single entry point for all database access.
//
// Golden Principle: never import the Drizzle client anywhere else — import `db`
// (and tables) from here. This keeps connection handling in one place and lets
// parallel streams share one stable surface.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — see .env.example");
}

// Reuse the client across hot reloads / Fluid Compute instances in dev.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client = globalForDb.client ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });

// Re-export tables so callers do `import { db, items } from "@/db"`.
export * from "./schema";
