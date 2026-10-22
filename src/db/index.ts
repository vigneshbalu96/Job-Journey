import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

// Dev-mode hot reload re-executes this module on every edit; without a
// singleton each reload would open a fresh postgres() pool and exhaust
// Supabase's pooler. Cache the client on globalThis in non-production.
//
// The client is created lazily on first use so that importing a module which
// imports `db` (unit tests, build-time analysis) does not require DATABASE_URL.
type Db = ReturnType<typeof createDb>;
const globalForDb = globalThis as unknown as { __jobJourneyDb?: Db };

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare:false is required for Supabase's transaction-mode pooler (port 6543).
  const client = postgres(url, { max: 8, prepare: false });
  return drizzle(client, { schema });
}

function getDb(): Db {
  if (globalForDb.__jobJourneyDb) return globalForDb.__jobJourneyDb;
  const instance = createDb();
  if (process.env.NODE_ENV !== "production") globalForDb.__jobJourneyDb = instance;
  else globalForDb.__jobJourneyDb = instance; // one per lambda instance is fine too
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop as string];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
  has(_target, prop) {
    return prop in (getDb() as object);
  },
});

export type Database = Db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbLike = Database | Transaction;
