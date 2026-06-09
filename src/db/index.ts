// Single entry point for all database access.
//
// Golden Principle: never import the Drizzle client anywhere else — import `db`
// (and tables) from here. This keeps connection handling in one place and lets
// parallel streams share one stable surface.
//
// The client is initialized lazily on first query, not at import time, so route
// modules that import `db` can be loaded during `next build` even before env is
// provisioned. The DATABASE_URL check fires on first real use, surfacing as a
// structured error through withErrorHandling rather than crashing the build.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

// Reuse the client across hot reloads / Fluid Compute instances.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
  db?: Database;
};

function getDb(): Database {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — provision Supabase first (docs/3-PROVISION.md)");
  }

  const client = globalForDb.client ?? postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.client = client;

  const database = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") globalForDb.db = database;
  return database;
}

// Lazy proxy: property access initializes the real client on demand.
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

// Re-export tables so callers do `import { db, chores } from "@/db"`.
export * from "./schema";
