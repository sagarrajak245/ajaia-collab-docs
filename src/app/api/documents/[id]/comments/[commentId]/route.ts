import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { commentParamsSchema, updateCommentSchema } from "@/server/validators/comment.validator";

/** PATCH /api/documents/:id/comments/:commentId: resolve or reopen a thread. */
export const PATCH = apiHandler({ params: commentParamsSchema, body: updateCommentSchema }, async ({ user, params, body }) =>
  getContainer().commentService.setResolved(params.id, user.userId, params.commentId, body.resolved),
);

/** DELETE /api/documents/:id/comments/:commentId: author or document owner only. */
export const DELETE = apiHandler({ params: commentParamsSchema }, async ({ user, params }) => {
  await getContainer().commentService.delete(params.id, user.userId, params.commentId);
  return { deleted: true };
});
