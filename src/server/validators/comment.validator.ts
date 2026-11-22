/** Request schemas for the comments API. */
import { z } from "zod";
import { COMMENT_LIMITS } from "@/server/constants";

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(COMMENT_LIMITS.BODY_MAX_LENGTH),
  /** Id of the editor comment mark this thread is anchored to (roots only). */
  anchorId: z.string().max(64).optional(),
  /** Snapshot of the highlighted text. */
  quote: z.string().max(500).optional(),
  /** Set when replying; must reference a root comment of the same document. */
  parentId: z.uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({ resolved: z.boolean() });
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const commentParamsSchema = z.object({ id: z.uuid(), commentId: z.uuid() });
