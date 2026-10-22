import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, type DbLike } from "@/db";
import { profiles, auditLog } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type UserContext = {
  userId: string;
  email: string;
  db: DbLike;
};

/** The signed-in Supabase user, memoised per request. Null when signed out. */
export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Ensures a profiles row exists for the auth user. Created lazily on the
 * first authenticated request; the create is audit-logged like any other.
 */
const ensureProfile = cache(async (userId: string, email: string) => {
  const existing = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) });
  if (existing) return existing;
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(profiles).values({ id: userId, email }).onConflictDoNothing().returning();
    if (row) {
      await tx.insert(auditLog).values({
        userId,
        tableName: "profiles",
        rowId: userId,
        action: "create",
        after: { email },
      });
      return row;
    }
    const again = await tx.query.profiles.findFirst({ where: eq(profiles.id, userId) });
    if (!again) throw new Error("profile create race");
    return again;
  });
});

/** Throws UnauthorizedError when signed out. Use in server actions and route handlers. */
export async function requireUser(): Promise<UserContext> {
  const user = await getAuthUser();
  if (!user || !user.email) throw new UnauthorizedError();
  await ensureProfile(user.id, user.email);
  return { userId: user.id, email: user.email, db };
}

/**
 * Wrap every server action / handler body in this. It resolves the user once
 * and hands you a context whose db is already the shared client; repo.ts
 * helpers take the same context so user scoping cannot be forgotten.
 */
export async function withUser<T>(fn: (ctx: UserContext) => Promise<T>): Promise<T> {
  const ctx = await requireUser();
  return fn(ctx);
}

export async function getProfile(userId: string) {
  const row = await db.query.profiles.findFirst({ where: eq(profiles.id, userId) });
  if (!row) throw new Error("profile missing");
  return row;
}
