/**
 * Document data access.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import {
  documents,
  documentShares,
  documentVersions,
  users,
  type DocumentRow,
} from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import type { ShareRole } from "@/server/constants";
import type { EditorContent } from "@/types/domain";

export interface DocumentWithOwner extends DocumentRow {
  ownerEmail: string;
  ownerName: string;
}

const withOwnerColumns = {
  id: documents.id,
  ownerId: documents.ownerId,
  title: documents.title,
  content: documents.content,
  version: documents.version,
  lastSnapshotAt: documents.lastSnapshotAt,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
  ownerEmail: users.email,
  ownerName: users.name,
};

export class DocumentRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<DocumentWithOwner | null> {
    const [row] = await this.db
      .select(withOwnerColumns)
      .from(documents)
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documents.id, id))
      .limit(1);
    return row ?? null;
  }

  /** Documents owned by the user, newest first (content excluded for list views). */
  async listOwned(userId: string) {
    return this.db
      .select({
        id: documents.id,
        title: documents.title,
        updatedAt: documents.updatedAt,
        ownerId: documents.ownerId,
        ownerEmail: users.email,
        ownerName: users.name,
      })
      .from(documents)
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documents.ownerId, userId))
      .orderBy(desc(documents.updatedAt));
  }

  /** Documents shared with the user, with the user's role on each. */
  async listSharedWith(userId: string) {
    return this.db
      .select({
        id: documents.id,
        title: documents.title,
        updatedAt: documents.updatedAt,
        ownerId: documents.ownerId,
        ownerEmail: users.email,
        ownerName: users.name,
        role: documentShares.role,
      })
      .from(documentShares)
      .innerJoin(documents, eq(documents.id, documentShares.documentId))
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documentShares.userId, userId))
      .orderBy(desc(documents.updatedAt));
  }

  /** The user's share role on a document, or null when not shared with them. */
  async findShareRole(documentId: string, userId: string): Promise<ShareRole | null> {
    const [row] = await this.db
      .select({ role: documentShares.role })
      .from(documentShares)
      .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, userId)))
      .limit(1);
    return row?.role ?? null;
  }

  async insert(values: { ownerId: string; title: string; content: EditorContent }): Promise<DocumentRow> {
    const [row] = await this.db.insert(documents).values(values).returning();
    return row;
  }

  /**
   * Optimistic-locking update: only succeeds when the stored version still equals
   * `expectedVersion`; increments the version atomically in the same statement.
   * Returns null when another save won the race (caller raises a 409).
   */
  async updateIfVersion(
    id: string,
    expectedVersion: number,
    patch: { title?: string; content?: EditorContent },
  ): Promise<DocumentRow | null> {
    const [row] = await this.db
      .update(documents)
      .set({ ...patch, version: sql`${documents.version} + 1`, updatedAt: new Date() })
      .where(and(eq(documents.id, id), eq(documents.version, expectedVersion)))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(documents).where(eq(documents.id, id));
  }

  /** Stores a version snapshot and records the snapshot time on the document. */
  async createSnapshot(doc: { id: string; title: string; content: unknown }, createdBy: string): Promise<void> {
    await this.db.insert(documentVersions).values({
      documentId: doc.id,
      title: doc.title,
      content: doc.content,
      createdBy,
    });
    await this.db.update(documents).set({ lastSnapshotAt: new Date() }).where(eq(documents.id, doc.id));
  }
}
