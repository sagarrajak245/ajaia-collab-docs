/**
 * Database client (Drizzle over postgres.js).
 *
 * Connects through the Supabase **transaction pooler** (port 6543). The
 * transaction pooler multiplexes server connections per transaction, so it
 * cannot keep prepared statements: `prepare: false` is required.
 * A small per-instance pool (`max: 5`) suits serverless functions.
 *
 * The client is cached on globalThis so Next.js dev hot-reloads don't open a
 * new pool on every change.
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/server/config/env";
import * as schema from "./schema";
import type { Db } from "./types";

const globalForDb = globalThis as unknown as { __db?: Db };

function createDb(): Db {
  const sql = postgres(getServerEnv().DATABASE_URL, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });
  return drizzle(sql, { schema }) as unknown as Db;
}

/** Lazily-created shared database instance. */
export function getDb(): Db {
  if (!globalForDb.__db) globalForDb.__db = createDb();
  return globalForDb.__db;
}
