import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { restoreVersionBody, versionParams } from "@/server/validators/version.validator";

/** POST /api/documents/:id/versions/:versionId/restore  body: { version } */
export const POST = apiHandler({ params: versionParams, body: restoreVersionBody }, async ({ user, params, body }) =>
  getContainer().versionService.restore(params.id, params.versionId, user.userId, body.version),
);
