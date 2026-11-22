import { z } from "zod";
import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { createCommentSchema } from "@/server/validators/comment.validator";

const params = z.object({ id: z.uuid() });

/** GET /api/documents/:id/comments: all threads (oldest first). */
export const GET = apiHandler({ params }, async ({ user, params }) =>
  getContainer().commentService.list(params.id, user.userId),
);

/** POST /api/documents/:id/comments: new root comment or reply (viewers allowed). */
export const POST = apiHandler({ params, body: createCommentSchema, successStatus: 201 }, async ({ user, params, body }) =>
  getContainer().commentService.create(params.id, user.userId, body),
);
