import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db, type DbLike } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Data-access helpers that enforce the two standing rules of this codebase:
 *   1. every read is scoped to the signed-in user and hides soft-deleted rows;
 *   2. every write is wrapped in a transaction with an audit_log row.
 *
 * Server actions should never call db.insert/update/delete directly on an
 * owned table; a vitest check greps for that.
 */

export type OwnedTable = PgTable & {
  id: PgColumn;
  userId: PgColumn;
  deletedAt: PgColumn;
};

export type RepoCtx = { userId: string; db?: DbLike };

type Row = Record<string, unknown>;

function tableName(table: PgTable): string {
  // drizzle exposes the SQL name under a symbol; this is the supported accessor.
  return (table as unknown as { [key: symbol]: string })[Symbol.for("drizzle:Name")];
}

/** WHERE user_id = ? AND deleted_at IS NULL [AND extra] */
export function scoped(table: OwnedTable, userId: string, extra?: SQL): SQL {
  const base = and(eq(table.userId, userId), isNull(table.deletedAt));
  return (extra ? and(base, extra) : base) as SQL;
}

export async function audit(
  tx: DbLike,
  input: {
    userId: string;
    tableName: string;
    rowId: string;
    action: "create" | "update" | "delete" | "restore";
    before?: Row | null;
    after?: Row | null;
  },
) {
  await tx.insert(auditLog).values({
    userId: input.userId,
    tableName: input.tableName,
    rowId: input.rowId,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}

/** Only the keys whose values differ, so kanban drags do not snapshot whole rows. */
export function diffRows(before: Row, after: Row): { before: Row; after: Row } {
  const b: Row = {};
  const a: Row = {};
  for (const key of Object.keys(after)) {
    if (key === "updatedAt") continue;
    const bv = before[key];
    const av = after[key];
    const same =
      bv instanceof Date && av instanceof Date ? bv.getTime() === av.getTime() : JSON.stringify(bv) === JSON.stringify(av);
    if (!same) {
      b[key] = bv;
      a[key] = av;
    }
  }
  return { before: b, after: a };
}

async function inTx<T>(ctx: RepoCtx, fn: (tx: DbLike) => Promise<T>): Promise<T> {
  // If the caller already passed a transaction, reuse it; otherwise open one.
  if (ctx.db && "rollback" in ctx.db) return fn(ctx.db);
  return (ctx.db ?? db).transaction(async (tx) => fn(tx));
}

export async function findOne<T extends OwnedTable>(
  ctx: RepoCtx,
  table: T,
  id: string,
): Promise<T["$inferSelect"] | undefined> {
  const [row] = await (ctx.db ?? db)
    .select()
    .from(table as PgTable)
    .where(scoped(table, ctx.userId, eq(table.id, id)))
    .limit(1);
  return row as T["$inferSelect"] | undefined;
}

export async function createRow<T extends OwnedTable>(
  ctx: RepoCtx,
  table: T,
  values: Omit<T["$inferInsert"], "userId" | "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<T["$inferSelect"]> {
  return inTx(ctx, async (tx) => {
    const [row] = (await tx
      .insert(table as PgTable)
      .values({ ...(values as Row), userId: ctx.userId })
      .returning()) as Row[];
    await audit(tx, {
      userId: ctx.userId,
      tableName: tableName(table),
      rowId: String(row.id),
      action: "create",
      after: row,
    });
    return row as T["$inferSelect"];
  });
}

export async function updateRow<T extends OwnedTable>(
  ctx: RepoCtx,
  table: T,
  id: string,
  patch: Partial<T["$inferInsert"]>,
): Promise<T["$inferSelect"]> {
  return inTx(ctx, async (tx) => {
    const [before] = (await tx
      .select()
      .from(table as PgTable)
      .where(scoped(table, ctx.userId, eq(table.id, id)))
      .limit(1)) as Row[];
    if (!before) throw new NotFoundError(tableName(table), id);
    const [after] = (await tx
      .update(table as PgTable)
      .set({ ...(patch as Row), updatedAt: new Date() })
      .where(scoped(table, ctx.userId, eq(table.id, id)))
      .returning()) as Row[];
    const diff = diffRows(before, after);
    if (Object.keys(diff.after).length > 0) {
      await audit(tx, {
        userId: ctx.userId,
        tableName: tableName(table),
        rowId: id,
        action: "update",
        before: diff.before,
        after: diff.after,
      });
    }
    return after as T["$inferSelect"];
  });
}

/** Soft delete: sets deleted_at, never issues SQL DELETE. */
export async function softDeleteRow<T extends OwnedTable>(ctx: RepoCtx, table: T, id: string): Promise<void> {
  await inTx(ctx, async (tx) => {
    const [before] = (await tx
      .select()
      .from(table as PgTable)
      .where(scoped(table, ctx.userId, eq(table.id, id)))
      .limit(1)) as Row[];
    if (!before) throw new NotFoundError(tableName(table), id);
    const now = new Date();
    await tx
      .update(table as PgTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(table.userId, ctx.userId), eq(table.id, id)));
    await audit(tx, {
      userId: ctx.userId,
      tableName: tableName(table),
      rowId: id,
      action: "delete",
      before,
    });
  });
}

export async function restoreRow<T extends OwnedTable>(ctx: RepoCtx, table: T, id: string): Promise<void> {
  await inTx(ctx, async (tx) => {
    const [row] = (await tx
      .select()
      .from(table as PgTable)
      .where(and(eq(table.userId, ctx.userId), eq(table.id, id)))
      .limit(1)) as Row[];
    if (!row || !row.deletedAt) throw new NotFoundError(tableName(table), id);
    await tx
      .update(table as PgTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(table.userId, ctx.userId), eq(table.id, id)));
    await audit(tx, { userId: ctx.userId, tableName: tableName(table), rowId: id, action: "restore", after: row });
  });
}

export class NotFoundError extends Error {
  constructor(table: string, id: string) {
    super(`${table} ${id} not found`);
    this.name = "NotFoundError";
  }
}
