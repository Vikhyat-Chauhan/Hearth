import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { billCreateSchema, parseBody } from "@/lib/validation";
import { parseDollarsToCents, formatCents } from "@/lib/utils";

describe("bill validation + money helpers", () => {
  it("rejects a zero or negative amount", () => {
    const r = parseBody(billCreateSchema, { householdId: randomUUID(), title: "Gas", amountCents: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects a non-integer (float) amount", () => {
    const r = parseBody(billCreateSchema, { householdId: randomUUID(), title: "Gas", amountCents: 12.5 });
    expect(r.success).toBe(false);
  });

  it("accepts a valid bill", () => {
    const r = parseBody(billCreateSchema, { householdId: randomUUID(), title: "Internet", amountCents: 4200 });
    expect(r.success).toBe(true);
  });

  it("parses dollars to integer cents without float drift", () => {
    expect(parseDollarsToCents("42.50")).toBe(4250);
    expect(parseDollarsToCents("0.1")).toBe(10);
    expect(parseDollarsToCents("abc")).toBeNull();
    expect(parseDollarsToCents("1.234")).toBeNull();
  });

  it("formats cents as currency", () => {
    expect(formatCents(4250)).toBe("$42.50");
  });
});

const hasDb = !!process.env.DATABASE_URL;
const profileIds: string[] = [];
const householdIds: string[] = [];

describe.skipIf(!hasDb)("bills read model", () => {
  afterAll(async () => {
    const { db, households, profiles } = await import("@/db");
    const { inArray } = await import("drizzle-orm");
    if (householdIds.length) await db.delete(households).where(inArray(households.id, householdIds));
    if (profileIds.length) await db.delete(profiles).where(inArray(profiles.id, profileIds));
  });

  it("orders unpaid bills before paid ones", async () => {
    const { db, profiles, households, memberships, bills } = await import("@/db");
    const { generateInviteCode } = await import("@/lib/household");
    const { listBills } = await import("@/lib/bills");

    const uid = randomUUID();
    profileIds.push(uid);
    await db.insert(profiles).values({ id: uid, email: `b-${uid}@test.dev`, name: "Payer" });

    const [hh] = await db
      .insert(households)
      .values({ name: "Bill House", adminUserId: uid, inviteCode: generateInviteCode() })
      .returning();
    householdIds.push(hh.id);
    await db.insert(memberships).values({ householdId: hh.id, userId: uid, role: "admin" });

    await db.insert(bills).values({ householdId: hh.id, title: "Paid bill", amountCents: 1000, paid: true, createdBy: uid });
    await db.insert(bills).values({ householdId: hh.id, title: "Unpaid bill", amountCents: 2000, paid: false, createdBy: uid });

    const list = await listBills(hh.id);
    expect(list).toHaveLength(2);
    expect(list[0].paid).toBe(false); // unpaid first
    expect(list[0].title).toBe("Unpaid bill");
  });
});
