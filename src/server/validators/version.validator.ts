/** Request schemas for the version-history endpoints. */
import { z } from "zod";

export const documentIdParams = z.object({ id: z.string().min(1) });

export const versionParams = z.object({ id: z.string().min(1), versionId: z.string().min(1) });

/** Restore carries the document version the client last saw (optimistic lock). */
export const restoreVersionBody = z.object({ version: z.number().int().min(1) });

export type RestoreVersionInput = z.infer<typeof restoreVersionBody>;
