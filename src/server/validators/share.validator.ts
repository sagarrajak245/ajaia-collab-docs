/** Request schemas for the sharing endpoints. */
import { z } from "zod";
import { SHARE_ROLES } from "@/server/constants";

/** Roles that can be granted. "owner" is deliberately absent: ownership is never shared. */
const shareRole = z.enum(SHARE_ROLES);

export const createShareSchema = z.object({
  // Trim + lowercase first so lookups match regardless of how the user typed the address.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: shareRole,
});

export const updateShareSchema = z.object({ role: shareRole });

/** Route params: `/documents/:id/shares[/:shareId]`. `shareId` is only present on item routes. */
export const shareParamsSchema = z.object({
  id: z.uuid(),
  shareId: z.uuid().optional(),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
