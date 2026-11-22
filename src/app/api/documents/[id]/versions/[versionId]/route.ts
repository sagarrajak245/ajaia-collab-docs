import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { versionParams } from "@/server/validators/version.validator";

/** GET /api/documents/:id/versions/:versionId: one version with content (preview). */
export const GET = apiHandler({ params: versionParams }, async ({ user, params }) =>
  getContainer().versionService.get(params.id, params.versionId, user.userId),
);
