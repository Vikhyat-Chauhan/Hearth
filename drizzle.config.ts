import { defineConfig } from "drizzle-kit";

// Uses DIRECT_URL (non-pooled) for migrations; the app runtime uses DATABASE_URL.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
