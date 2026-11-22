import { getContainer } from "@/server/container";
import { apiHandler } from "@/server/middleware/api-handler";
import { importUploadSchema } from "@/server/validators/upload.validator";

// mammoth and Buffer need the Node runtime (not edge).
export const runtime = "nodejs";

/** Step 2 of import: validate + convert the uploaded file and create the document. */
export const POST = apiHandler({ body: importUploadSchema, successStatus: 201 }, async ({ user, body }) =>
  getContainer().uploadService.importToDocument(user.userId, body),
);
