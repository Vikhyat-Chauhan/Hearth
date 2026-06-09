import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { expenseCreateSchema, settlementCreateSchema, parseBody } from "@/lib/validation";
import { splitEqually } from "@/lib/utils";

describe("expense validation + split math", () => {
  it("rejects splits that don't sum to the total", () => {
    const r = parseBody(expenseCreateSchema, {
      householdId: randomUUID(),
      description: "Pizza",
      amountCents: 1000,
      paidBy: randomUUID(),
      splits: [{ userId: randomUUID(), shareCents: 400 }, { userId: randomUUID(), shareCents: 400 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts splits that sum to the total", () => {
    const a = randomUUID();
    const b = randomUUID();
    const r = parseBody(expenseCreateSchema, {
      householdId: randomUUID(),
      description: "Pizza",
      amountCents: 1000,
      paidBy: a,
      splits: [{ userId: a, shareCents: 500 }, { userId: b, shareCents: 500 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a settlement between the same member", () => {
    const u = randomUUID();
    const r = parseBody(settlementCreateSchema, { householdId: randomUUID(), fromUserId: u, toUserId: u, amountCents: 500 });
    expect(r.success).toBe(false);
  });

  it("splitEqually distributes remainder and sums exactly", () => {
    const shares = splitEqually(1000, 3);
    expect(shares).toEqual([334, 333, 333]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("expense balances", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("computes zero-sum balances from an expense and a settlement", async () => {
    const { db, profiles, households, memberships, expenses, expenseSplits, settlements } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { computeBalances } = await import("@/lib/expenses");

    const a = randomUUID();
    const b = randomUUID();
    profileIds.push(a, b);
    await db.insert(profiles).values([
      { id: a, email: `ea-${a}@test.dev`, name: "Ana" },
      { id: b, email: `eb-${b}@test.dev`, name: "Ben" },
    ]);

    const [hh] = await db
      .insert(households)
      .values({ name: "Split House", adminUserId: a, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values([
      { householdId: hh.id, userId: a, role: "admin" },
      { householdId: hh.id, userId: b, role: "member" },
    ]);

    // Ana pays $10, split evenly → Ben owes Ana $5.
    const [exp] = await db
      .insert(expenses)
      .values({ householdId: hh.id, description: "Dinner", amountCents: 1000, paidBy: a, createdBy: a })
      .returning();
    await db.insert(expenseSplits).values([
      { expenseId: exp.id, userId: a, shareCents: 500 },
      { expenseId: exp.id, userId: b, shareCents: 500 },
    ]);

    let balances = await computeBalances(hh.id);
    const netA = balances.find((x) => x.userId === a)!.netCents;
    const netB = balances.find((x) => x.userId === b)!.netCents;
    expect(netA).toBe(500); // Ana is owed $5
    expect(netB).toBe(-500); // Ben owes $5
    expect(netA + netB).toBe(0); // zero-sum

    // Ben pays Ana $5 → all settled.
    await db.insert(settlements).values({ householdId: hh.id, fromUserId: b, toUserId: a, amountCents: 500, createdBy: b });
    balances = await computeBalances(hh.id);
    expect(balances.find((x) => x.userId === a)!.netCents).toBe(0);
    expect(balances.find((x) => x.userId === b)!.netCents).toBe(0);
  });
});
