import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// Cached on globalThis so dev hot reloads reuse one connection pool.
const cache = globalThis as unknown as { marginlogSql?: postgres.Sql; marginlogDb?: Db };

/** Creates the client on first use. Throws at request time, never at import or build time. */
export function getDb(): Db {
  if (cache.marginlogDb) return cache.marginlogDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Put the Supabase Postgres connection string in apps/server/.env.local or the environment.");
  }
  // prepare: false is required by the Supabase transaction pooler.
  const sql = postgres(url, { prepare: false });
  cache.marginlogSql = sql;
  cache.marginlogDb = drizzle({ client: sql, schema });
  return cache.marginlogDb;
}

/** Closes the pool. Only scripts need this; route handlers keep the pool open. */
export async function closeDb(): Promise<void> {
  await cache.marginlogSql?.end();
  cache.marginlogSql = undefined;
  cache.marginlogDb = undefined;
}
