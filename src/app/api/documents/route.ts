/**
 * GET  /api/documents: { owned, shared } for the dashboard
 * POST /api/documents: create a blank document
 */
import { getContainer } from "@/server/container";
import { apiHandler } from "@/server/middleware/api-handler";
import { createDocumentSchema } from "@/server/validators/document.validator";

export const GET = apiHandler({}, async ({ user }) => getContainer().documentService.listForUser(user.userId));

export const POST = apiHandler({ body: createDocumentSchema, successStatus: 201 }, async ({ user, body }) =>
  getContainer().documentService.create(user.userId, body),
);
