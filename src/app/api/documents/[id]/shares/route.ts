/** GET /api/documents/:id/shares (list) and POST (share by email). */
import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { createShareSchema, shareParamsSchema } from "@/server/validators/share.validator";

export const GET = apiHandler({ params: shareParamsSchema }, async ({ user, params }) =>
  getContainer().shareService.list(params.id, user.userId),
);

export const POST = apiHandler(
  { params: shareParamsSchema, body: createShareSchema, successStatus: 201 },
  async ({ user, params, body }) => getContainer().shareService.share(params.id, user.userId, body),
);
