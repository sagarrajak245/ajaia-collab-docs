/**
 * GET    /api/documents/:id: load (viewer+)
 * PATCH  /api/documents/:id: save title/content with optimistic version (editor+)
 * DELETE /api/documents/:id: delete (owner)
 */
import { getContainer } from "@/server/container";
import { apiHandler } from "@/server/middleware/api-handler";
import { documentIdParams, updateDocumentSchema } from "@/server/validators/document.validator";

export const GET = apiHandler({ params: documentIdParams }, async ({ user, params }) =>
  getContainer().documentService.get(params.id, user.userId),
);

export const PATCH = apiHandler({ params: documentIdParams, body: updateDocumentSchema }, async ({ user, params, body }) =>
  getContainer().documentService.update(params.id, user.userId, body),
);

export const DELETE = apiHandler({ params: documentIdParams }, async ({ user, params }) => {
  await getContainer().documentService.delete(params.id, user.userId);
  return { deleted: true };
});
