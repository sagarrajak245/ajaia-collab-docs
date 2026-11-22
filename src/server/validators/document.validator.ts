/** Request validation rules for document endpoints. */
import { z } from "zod";
import { DOCUMENT_LIMITS } from "@/server/constants";

export const documentIdParams = z.object({ id: z.uuid("Invalid document id") });

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(DOCUMENT_LIMITS.TITLE_MAX_LENGTH, `Title must be at most ${DOCUMENT_LIMITS.TITLE_MAX_LENGTH} characters`);

/**
 * Editor JSON. We validate the envelope (`type: "doc"`) and the serialized size;
 * the node tree itself is owned by the editor schema and rendered by TipTap,
 * never injected as HTML, so arbitrary node content cannot cause XSS.
 */
export const editorContentSchema = z
  .looseObject({ type: z.literal("doc"), content: z.array(z.unknown()).optional() })
  .refine((c) => JSON.stringify(c).length <= DOCUMENT_LIMITS.CONTENT_MAX_BYTES, {
    message: "Document is too large (max ~1 MB)",
  });

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: editorContentSchema.optional(),
    /** Version the client last loaded: required for optimistic locking. */
    version: z.number().int().positive(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Provide a title or content to update",
  });

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
