import { getContainer } from "@/server/container";
import { apiHandler } from "@/server/middleware/api-handler";
import { signUploadSchema } from "@/server/validators/upload.validator";

/** Step 1 of import: returns a signed upload token for a server-chosen storage path. */
export const POST = apiHandler({ body: signUploadSchema }, async ({ user, body }) =>
  getContainer().uploadService.sign(user.userId, body),
);
