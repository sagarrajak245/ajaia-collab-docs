/** Data access for comments. No authorization here; CommentService owns that. */
import { and, asc, eq } from "drizzle-orm";
import { comments, users, type CommentRow } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

export interface CommentWithAuthor extends CommentRow {
  authorName: string;
  authorEmail: string;
}

export class CommentRepository {
  constructor(private readonly db: Db) {}

  /** All comments of a document with author info, oldest first. */
  async listByDocument(documentId: string): Promise<CommentWithAuthor[]> {
    const rows = await this.db
      .select({ comment: comments, authorName: users.name, authorEmail: users.email })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.documentId, documentId))
      .orderBy(asc(comments.createdAt), asc(comments.id));
    return rows.map((r) => ({ ...r.comment, authorName: r.authorName, authorEmail: r.authorEmail }));
  }

  /** Scoped to the document so ids from another document never resolve. */
  async findInDocument(documentId: string, commentId: string): Promise<CommentRow | undefined> {
    const [row] = await this.db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.documentId, documentId)))
      .limit(1);
    return row;
  }

  async insert(values: typeof comments.$inferInsert): Promise<CommentRow> {
    const [row] = await this.db.insert(comments).values(values).returning();
    return row;
  }

  async setResolved(commentId: string, resolved: boolean): Promise<CommentRow> {
    const [row] = await this.db.update(comments).set({ resolved }).where(eq(comments.id, commentId)).returning();
    return row;
  }

  /** Replies are removed by the parent_id ON DELETE CASCADE foreign key. */
  async delete(commentId: string): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, commentId));
  }
}
