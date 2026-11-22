/**
 * Document share data access. No business rules here: the service decides who
 * may share what; this class only reads and writes `document_shares`.
 */
import { and, asc, eq } from "drizzle-orm";
import { documentShares, users } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import type { ShareRole } from "@/server/constants";

export interface ShareWithUser {
  id: string;
  role: ShareRole;
  createdAt: Date;
  userId: string;
  userEmail: string;
  userName: string;
}

export class ShareRepository {
  constructor(private readonly db: Db) {}

  private selectWithUser() {
    return this.db
      .select({
        id: documentShares.id,
        role: documentShares.role,
        createdAt: documentShares.createdAt,
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
      })
      .from(documentShares)
      .innerJoin(users, eq(users.id, documentShares.userId));
  }

  async listForDocument(documentId: string): Promise<ShareWithUser[]> {
    return this.selectWithUser()
      .where(eq(documentShares.documentId, documentId))
      .orderBy(asc(documentShares.createdAt));
  }

  async findInDocument(shareId: string, documentId: string): Promise<ShareWithUser | null> {
    const [row] = await this.selectWithUser()
      .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
      .limit(1);
    return row ?? null;
  }

  /** Insert, or update the role when (document, user) is already shared. Returns the share id. */
  async upsert(documentId: string, userId: string, role: ShareRole): Promise<string> {
    const [row] = await this.db
      .insert(documentShares)
      .values({ documentId, userId, role })
      .onConflictDoUpdate({ target: [documentShares.documentId, documentShares.userId], set: { role } })
      .returning({ id: documentShares.id });
    return row.id;
  }

  /** Scoped to the document so a share id from another document can never match. */
  async updateRole(shareId: string, documentId: string, role: ShareRole): Promise<boolean> {
    const rows = await this.db
      .update(documentShares)
      .set({ role })
      .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
      .returning({ id: documentShares.id });
    return rows.length > 0;
  }

  async delete(shareId: string, documentId: string): Promise<boolean> {
    const rows = await this.db
      .delete(documentShares)
      .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
      .returning({ id: documentShares.id });
    return rows.length > 0;
  }
}
