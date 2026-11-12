import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Schema = typeof schema;

/** Any Drizzle Postgres database (or transaction) bound to this schema. */
export type Database = PgDatabase<
  PgQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>;

export function createDb(url: string) {
  // prepare: false keeps it compatible with transaction-mode poolers (Neon/Supabase).
  const sql = postgres(url, { prepare: false });
  return { db: drizzle(sql, { schema }), sql };
}

// Reuse one pool across hot reloads in dev.
const globalForDb = globalThis as unknown as {
  dbConnection?: ReturnType<typeof createDb>;
};

function getConnection() {
  if (!globalForDb.dbConnection) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.dbConnection = createDb(url);
  }
  return globalForDb.dbConnection;
}

/** Lazily connected app-wide database. */
export const db = new Proxy({} as ReturnType<typeof createDb>["db"], {
  get(_target, prop) {
    const real = getConnection().db;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
