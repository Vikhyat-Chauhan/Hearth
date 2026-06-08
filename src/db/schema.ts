// Drizzle schema — the single source of truth for the database shape.
//
// FROZEN after Sprint 0: parallel feature streams read this but never edit it.
// Changes go through the user (Schema Change Protocol in docs/3-ORCHESTRATION.md),
// followed by `npm run db:generate`.
//
// Conventions:
// - Money is stored as cents (integer), never a float.
// - User-owned entities carry a `userId` column and are query-scoped to the owner.
//
// Example (delete once real entities exist):
//
// import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
//
// export const items = pgTable("items", {
//   id: uuid("id").primaryKey().defaultRandom(),
//   userId: uuid("user_id").notNull(),
//   title: text("title").notNull(),
//   priceCents: integer("price_cents").notNull().default(0),
//   createdAt: timestamp("created_at").notNull().defaultNow(),
// });

export {};
