/**
 * User data access. Repositories only talk to the database: no business rules,
 * no HTTP concerns. They receive the Db via the constructor (dependency injection)
 * so integration tests can pass an in-memory PGlite database.
 */
import { eq, inArray } from "drizzle-orm";
import { users, type UserRow } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

export class UserRepository {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByIds(ids: string[]): Promise<UserRow[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(users).where(inArray(users.id, ids));
  }

  /** All users (small demo directory, used for the share picker). */
  async listAll(): Promise<UserRow[]> {
    return this.db.select().from(users).orderBy(users.name);
  }
}
