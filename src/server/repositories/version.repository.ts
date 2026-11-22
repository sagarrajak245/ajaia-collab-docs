/**
 * Version-history data access (reads and pruning of `document_versions`).
 * Writing a snapshot lives in DocumentRepository.createSnapshot.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { documentVersions, users } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { VERSION_LIMITS } from "@/server/constants";

export class VersionRepository {
  constructor(private readonly db: Db) {}

  /** Versions of a document, newest first, with author; content excluded (can be large). */
  async list(documentId: string) {
    return this.db
      .select({
        id: documentVersions.id,
        title: documentVersions.title,
        createdAt: documentVersions.createdAt,
        authorId: users.id,
        authorEmail: users.email,
        authorName: users.name,
      })
      .from(documentVersions)
      .innerJoin(users, eq(users.id, documentVersions.createdBy))
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt), desc(documentVersions.id))
      .limit(VERSION_LIMITS.MAX_VERSIONS_PER_DOCUMENT);
  }

  /** One version including its content. Scoped by documentId so ids cannot cross documents. */
  async findById(versionId: string, documentId: string) {
    const [row] = await this.db
      .select({
        id: documentVersions.id,
        title: documentVersions.title,
        content: documentVersions.content,
        createdAt: documentVersions.createdAt,
        authorId: users.id,
        authorEmail: users.email,
        authorName: users.name,
      })
      .from(documentVersions)
      .innerJoin(users, eq(users.id, documentVersions.createdBy))
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
      .limit(1);
    return row ?? null;
  }

  /** Deletes everything except the newest `keep` versions of the document. */
  async pruneOldest(documentId: string, keep: number): Promise<void> {
    const stale = await this.db
      .select({ id: documentVersions.id })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt), desc(documentVersions.id))
      .offset(keep);
    if (stale.length === 0) return;
    await this.db.delete(documentVersions).where(
      inArray(
        documentVersions.id,
        stale.map((r) => r.id),
      ),
    );
  }
}
