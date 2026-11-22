/**
 * Version history: list, manual snapshot, preview and non-destructive restore.
 * Restore never loses data: the current state is snapshotted first, so a
 * restore can itself be undone by restoring that snapshot.
 */
import { VERSION_LIMITS } from "@/server/constants";
import { NotFoundError, VersionConflictError } from "@/server/exceptions";
import type { DocumentRepository } from "@/server/repositories/document.repository";
import type { VersionRepository } from "@/server/repositories/version.repository";
import type { DocumentDetail, DocumentVersionDto, EditorContent } from "@/types/domain";
import type { DocumentService } from "./document.service";

type VersionRow = Awaited<ReturnType<VersionRepository["list"]>>[number];

export interface DocumentVersionDetail extends DocumentVersionDto {
  content: EditorContent;
}

export class VersionService {
  constructor(
    private readonly versions: VersionRepository,
    private readonly docs: DocumentRepository,
    private readonly documents: DocumentService,
  ) {}

  async list(documentId: string, userId: string): Promise<DocumentVersionDto[]> {
    await this.documents.authorize(documentId, userId, "view");
    return (await this.versions.list(documentId)).map(toDto);
  }

  /** A single version with content, for read-only preview. */
  async get(documentId: string, versionId: string, userId: string): Promise<DocumentVersionDetail> {
    await this.documents.authorize(documentId, userId, "view");
    const row = await this.versions.findById(versionId, documentId);
    if (!row) throw new NotFoundError("Version");
    return { ...toDto(row), content: row.content as EditorContent };
  }

  /** Explicit "Save version": snapshots the document as it is right now. */
  async saveManual(documentId: string, userId: string): Promise<void> {
    const { doc } = await this.documents.authorize(documentId, userId, "edit");
    await this.docs.createSnapshot(doc, userId);
    await this.versions.pruneOldest(documentId, VERSION_LIMITS.MAX_VERSIONS_PER_DOCUMENT);
  }

  /**
   * Restores a version's title and content as a new edit (version counter
   * advances; history is untouched). `expectedVersion` guards against restoring
   * over edits made since the client loaded the document.
   */
  async restore(
    documentId: string,
    versionId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<DocumentDetail> {
    const { doc, role } = await this.documents.authorize(documentId, userId, "restoreVersion");
    const target = await this.versions.findById(versionId, documentId);
    if (!target) throw new NotFoundError("Version");

    // Fail fast on a stale client before writing anything.
    if (doc.version !== expectedVersion) throw new VersionConflictError(doc.version);

    // Snapshot the current state first so the restore is undoable.
    await this.docs.createSnapshot(doc, userId);

    const updated = await this.docs.updateIfVersion(documentId, expectedVersion, {
      title: target.title,
      content: target.content as EditorContent,
    });
    if (!updated) {
      const current = await this.docs.findById(documentId);
      throw new VersionConflictError(current?.version ?? doc.version);
    }

    await this.versions.pruneOldest(documentId, VERSION_LIMITS.MAX_VERSIONS_PER_DOCUMENT);

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content as EditorContent,
      version: updated.version,
      owner: { id: doc.ownerId, email: doc.ownerEmail, name: doc.ownerName },
      role,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

function toDto(row: Pick<VersionRow, "id" | "title" | "createdAt" | "authorId" | "authorEmail" | "authorName">): DocumentVersionDto {
  return {
    id: row.id,
    title: row.title,
    createdBy: { id: row.authorId, email: row.authorEmail, name: row.authorName },
    createdAt: row.createdAt.toISOString(),
  };
}
