import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, companies } from "@/db/schema";
import { createRow, findOne, restoreRow, softDeleteRow, updateRow, NotFoundError } from "./repo";
import { createTestDb, type TestDb } from "@/test/pglite";
import type { DbLike } from "@/db";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";

let db: TestDb;
let close: () => Promise<void>;
const ctx = (userId: string) => ({ userId, db: db as unknown as DbLike });

// pglite downloads/initialises its WASM bundle on first use; allow for a cold machine.
beforeAll(async () => {
  ({ db, close } = await createTestDb());
}, 60_000);
afterAll(async () => close());

describe("repo helpers against the real migration", () => {
  it("create → update → soft delete → restore, each audited with changed columns only", async () => {
    const created = await createRow(ctx(alice), companies, { name: "Acme", industry: "Robotics" });
    expect(created.userId).toBe(alice);

    const updated = await updateRow(ctx(alice), companies, created.id, { industry: "Drones" });
    expect(updated.industry).toBe("Drones");

    await softDeleteRow(ctx(alice), companies, created.id);
    expect(await findOne(ctx(alice), companies, created.id)).toBeUndefined();

    await restoreRow(ctx(alice), companies, created.id);
    expect((await findOne(ctx(alice), companies, created.id))?.name).toBe("Acme");

    const trail = await db.select().from(auditLog).where(eq(auditLog.rowId, created.id)).orderBy(auditLog.id);
    expect(trail.map((t) => t.action)).toEqual(["create", "update", "delete", "restore"]);
    expect(trail[1].before).toEqual({ industry: "Robotics" });
    expect(trail[1].after).toEqual({ industry: "Drones" });

    // No SQL DELETE happened: the row still exists physically.
    const [raw] = await db.select().from(companies).where(eq(companies.id, created.id));
    expect(raw).toBeDefined();
  });

  it("never lets one user read or modify another user's rows", async () => {
    const mine = await createRow(ctx(alice), companies, { name: "Private Co" });
    expect(await findOne(ctx(bob), companies, mine.id)).toBeUndefined();
    await expect(updateRow(ctx(bob), companies, mine.id, { name: "Hijacked" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(softDeleteRow(ctx(bob), companies, mine.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await findOne(ctx(alice), companies, mine.id))?.name).toBe("Private Co");
  });

  it("partial unique index lets a soft-deleted name be reused", async () => {
    const first = await createRow(ctx(alice), companies, { name: "Dup Co" });
    await expect(createRow(ctx(alice), companies, { name: "dup co" })).rejects.toThrow();
    await softDeleteRow(ctx(alice), companies, first.id);
    const second = await createRow(ctx(alice), companies, { name: "Dup Co" });
    expect(second.id).not.toBe(first.id);
  });

  it("skips the audit row when an update changes nothing", async () => {
    const row = await createRow(ctx(alice), companies, { name: "Same Co" });
    await updateRow(ctx(alice), companies, row.id, { name: "Same Co" });
    const trail = await db.select().from(auditLog).where(eq(auditLog.rowId, row.id));
    expect(trail).toHaveLength(1);
  });
});
