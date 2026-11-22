/** PATCH /api/documents/:id/shares/:shareId (change role) and DELETE (revoke). */
import { apiHandler } from "@/server/middleware/api-handler";
import { getContainer } from "@/server/container";
import { shareParamsSchema, updateShareSchema } from "@/server/validators/share.validator";

export const PATCH = apiHandler({ params: shareParamsSchema, body: updateShareSchema }, async ({ user, params, body }) =>
  // shareId is optional in the shared params schema but always present on this route.
  getContainer().shareService.updateRole(params.id, params.shareId!, user.userId, body.role),
);

export const DELETE = apiHandler({ params: shareParamsSchema }, async ({ user, params }) => {
  await getContainer().shareService.revoke(params.id, params.shareId!, user.userId);
  return null;
});
