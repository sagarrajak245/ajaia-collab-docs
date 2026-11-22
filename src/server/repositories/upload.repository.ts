/** Upload bookkeeping rows (one per signed upload). Data access only. */
import { and, eq } from "drizzle-orm";
import { uploads } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

export type UploadRow = typeof uploads.$inferSelect;

export class UploadRepository {
  constructor(private readonly db: Db) {}

  async insert(values: typeof uploads.$inferInsert): Promise<UploadRow> {
    const [row] = await this.db.insert(uploads).values(values).returning();
    return row;
  }

  /** Scoped by owner so one user can never address another user's upload. */
  async findOwned(id: string, ownerId: string): Promise<UploadRow | null> {
    const [row] = await this.db
      .select()
      .from(uploads)
      .where(and(eq(uploads.id, id), eq(uploads.ownerId, ownerId)))
      .limit(1);
    return row ?? null;
  }

  /** Atomically claims a pending upload so it can be imported only once. */
  async claimPending(id: string): Promise<boolean> {
    const rows = await this.db
      .update(uploads)
      .set({ status: "imported" })
      .where(and(eq(uploads.id, id), eq(uploads.status, "pending")))
      .returning({ id: uploads.id });
    return rows.length > 0;
  }

  async markImported(id: string, documentId: string): Promise<void> {
    await this.db.update(uploads).set({ status: "imported", documentId }).where(eq(uploads.id, id));
  }

  async markRejected(id: string): Promise<void> {
    await this.db.update(uploads).set({ status: "rejected" }).where(eq(uploads.id, id));
  }
}
