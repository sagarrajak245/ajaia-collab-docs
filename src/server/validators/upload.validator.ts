import { z } from "zod";
import { UPLOAD_MAX_BYTES } from "@/server/constants/upload";

export const signUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(UPLOAD_MAX_BYTES, "File exceeds the size limit"),
  mimeType: z.string().max(255).default(""),
});
export type SignUploadInput = z.infer<typeof signUploadSchema>;

export const importUploadSchema = z.object({ uploadId: z.uuid() });
export type ImportUploadInput = z.infer<typeof importUploadSchema>;
