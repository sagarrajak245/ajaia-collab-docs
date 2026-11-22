/**
 * Comment threads: list, create (root or reply), resolve/reopen, delete.
 * Authorization goes through DocumentService.authorize so rules stay in one place:
 * anyone who can view a document may comment (viewers included); only the
 * author or the document owner may delete.
 */
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/exceptions";
import type { CommentRepository, CommentWithAuthor } from "@/server/repositories/comment.repository";
import type { CommentRow } from "@/server/db/schema";
import type { CreateCommentInput } from "@/server/validators/comment.validator";
import type { CommentDto } from "@/types/domain";
import type { DocumentService } from "./document.service";

export class CommentService {
  constructor(
    private readonly repo: CommentRepository,
    private readonly documents: DocumentService,
  ) {}

  async list(documentId: string, userId: string): Promise<CommentDto[]> {
    await this.documents.authorize(documentId, userId, "view");
    return (await this.repo.listByDocument(documentId)).map(toDto);
  }

  async create(documentId: string, userId: string, input: CreateCommentInput): Promise<CommentDto> {
    await this.documents.authorize(documentId, userId, "comment");

    if (input.parentId) {
      // Threads are one level deep: the parent must be a root comment of this document.
      const parent = await this.repo.findInDocument(documentId, input.parentId);
      if (!parent || parent.parentId) throw new ValidationError("Replies must target a root comment");
    }

    const isReply = Boolean(input.parentId);
    const row = await this.repo.insert({
      documentId,
      authorId: userId,
      body: input.body,
      parentId: input.parentId ?? null,
      // Replies never carry their own anchor; they inherit the root's.
      anchorId: isReply ? null : (input.anchorId ?? null),
      quote: isReply ? null : (input.quote ?? null),
    });
    const created = (await this.repo.listByDocument(documentId)).find((c) => c.id === row.id);
    return toDto(created!);
  }

  async setResolved(documentId: string, userId: string, commentId: string, resolved: boolean): Promise<CommentDto> {
    await this.documents.authorize(documentId, userId, "comment");
    const comment = await this.requireComment(documentId, commentId);
    if (comment.parentId) throw new ValidationError("Only root comments can be resolved");
    await this.repo.setResolved(commentId, resolved);
    const updated = (await this.repo.listByDocument(documentId)).find((c) => c.id === commentId);
    return toDto(updated!);
  }

  async delete(documentId: string, userId: string, commentId: string): Promise<void> {
    const { doc } = await this.documents.authorize(documentId, userId, "comment");
    const comment = await this.requireComment(documentId, commentId);
    if (comment.authorId !== userId && doc.ownerId !== userId) {
      throw new ForbiddenError("Only the author or the document owner can delete a comment");
    }
    await this.repo.delete(commentId);
  }

  private async requireComment(documentId: string, commentId: string): Promise<CommentRow> {
    const comment = await this.repo.findInDocument(documentId, commentId);
    if (!comment) throw new NotFoundError("Comment");
    return comment;
  }
}

function toDto(c: CommentWithAuthor): CommentDto {
  return {
    id: c.id,
    documentId: c.documentId,
    author: { id: c.authorId, email: c.authorEmail, name: c.authorName },
    anchorId: c.anchorId,
    quote: c.quote,
    body: c.body,
    resolved: c.resolved,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
  };
}
