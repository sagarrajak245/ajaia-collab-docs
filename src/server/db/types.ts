/**
 * Driver-agnostic database type.
 *
 * Repositories depend on this interface rather than on a concrete driver, so
 * production uses postgres.js (Supabase) while integration tests inject an
 * in-memory PGlite database running the same migrations.
 */
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
