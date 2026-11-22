/**
 * Integration-test database: an in-memory Postgres (PGlite, WASM) with the
 * project's REAL Drizzle migrations applied. Tests exercise actual SQL,
 * constraints, cascades and joins, without touching the hosted database.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { hashPassword } from "@/server/lib/password";

export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../src/server/db/migrations") });
  return db as unknown as Db;
}

/** Inserts a user and returns it. Password is "password123". */
export async function createTestUser(db: Db, email: string, name = email.split("@")[0]) {
  const [user] = await db
    .insert(schema.users)
    .values({ email, name, passwordHash: await hashPassword("password123") })
    .returning();
  return user;
}
