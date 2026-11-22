/**
 * Document business logic: listing, loading, creating, saving (with optimistic
 * locking + throttled version snapshots) and deleting.
 * Every operation resolves the caller's role and checks it with the access policy.
 */
import { DOCUMENT_LIMITS, VERSION_LIMITS, type DocumentRole } from "@/server/constants";
import { NotFoundError, VersionConflictError } from "@/server/exceptions";
import type { DocumentRepository, DocumentWithOwner } from "@/server/repositories/document.repository";
import type { CreateDocumentInput, UpdateDocumentInput } from "@/server/validators/document.validator";
import type { DocumentDetail, DocumentSummary, EditorContent } from "@/types/domain";
import { assertCan, resolveRole, type DocumentAction } from "./access-policy";

export const EMPTY_DOCUMENT: EditorContent = { type: "doc", content: [{ type: "paragraph" }] };

export class DocumentService {
  constructor(private readonly docs: DocumentRepository) {}

  /**
   * Loads a document and asserts the user may perform `action` on it.
   * Exported for other services (sharing, versions, comments) so they all
   * share one authorization path.
   */
  async authorize(
    documentId: string,
    userId: string,
    action: DocumentAction,
  ): Promise<{ doc: DocumentWithOwner; role: DocumentRole }> {
    const doc = await this.docs.findById(documentId);
    if (!doc) throw new NotFoundError("Document");
    const shareRole = doc.ownerId === userId ? null : await this.docs.findShareRole(documentId, userId);
    const role = resolveRole(doc, userId, shareRole);
    assertCan(role, action);
    return { doc, role: role! };
  }

  async listForUser(userId: string): Promise<{ owned: DocumentSummary[]; shared: DocumentSummary[] }> {
    const [owned, shared] = await Promise.all([this.docs.listOwned(userId), this.docs.listSharedWith(userId)]);
    const toSummary = (d: (typeof owned)[number], role: DocumentRole): DocumentSummary => ({
      id: d.id,
      title: d.title,
      owner: { id: d.ownerId, email: d.ownerEmail, name: d.ownerName },
      role,
      updatedAt: d.updatedAt.toISOString(),
    });
    return {
      owned: owned.map((d) => toSummary(d, "owner")),
      shared: shared.map((d) => toSummary(d, d.role)),
    };
  }

  async get(documentId: string, userId: string): Promise<DocumentDetail> {
    const { doc, role } = await this.authorize(documentId, userId, "view");
    return toDetail(doc, role);
  }

  async create(userId: string, input: CreateDocumentInput, content: EditorContent = EMPTY_DOCUMENT): Promise<DocumentDetail> {
    const row = await this.docs.insert({
      ownerId: userId,
      title: input.title ?? DOCUMENT_LIMITS.DEFAULT_TITLE,
      content,
    });
    const doc = await this.docs.findById(row.id);
    return toDetail(doc!, "owner");
  }

  /**
   * Saves title and/or content. Fails with 409 VERSION_CONFLICT if the document
   * changed since the client loaded `input.version`, so concurrent editors never
   * silently overwrite each other. Takes an automatic version snapshot at most
   * once per AUTO_SNAPSHOT_INTERVAL_MS.
   */
  async update(documentId: string, userId: string, input: UpdateDocumentInput): Promise<DocumentDetail> {
    const { doc: before, role } = await this.authorize(documentId, userId, "edit");

    const updated = await this.docs.updateIfVersion(documentId, input.version, {
      title: input.title,
      content: input.content as EditorContent | undefined,
    });
    if (!updated) {
      const current = await this.docs.findById(documentId);
      throw new VersionConflictError(current?.version ?? before.version);
    }

    const last = before.lastSnapshotAt?.getTime() ?? 0;
    if (input.content && Date.now() - last >= VERSION_LIMITS.AUTO_SNAPSHOT_INTERVAL_MS) {
      await this.docs.createSnapshot(updated, userId);
    }

    return toDetail({ ...updated, ownerEmail: before.ownerEmail, ownerName: before.ownerName }, role);
  }

  async delete(documentId: string, userId: string): Promise<void> {
    await this.authorize(documentId, userId, "delete");
    await this.docs.delete(documentId);
  }
}

function toDetail(doc: DocumentWithOwner, role: DocumentRole): DocumentDetail {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content as EditorContent,
    version: doc.version,
    owner: { id: doc.ownerId, email: doc.ownerEmail, name: doc.ownerName },
    role,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
