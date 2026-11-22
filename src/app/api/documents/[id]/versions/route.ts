import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { documentIdParams } from "@/server/validators/version.validator";

/** GET /api/documents/:id/versions: version list, newest first. */
export const GET = apiHandler({ params: documentIdParams }, async ({ user, params }) =>
  getContainer().versionService.list(params.id, user.userId),
);

/** POST /api/documents/:id/versions: manual "Save version" snapshot. */
export const POST = apiHandler({ params: documentIdParams, successStatus: 201 }, async ({ user, params }) => {
  await getContainer().versionService.saveManual(params.id, user.userId);
  return { saved: true };
});
