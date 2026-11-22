/**
 * Access policy: the single source of truth for "who can do what" on a document.
 *
 * Pure functions (no I/O), so the whole permission matrix is unit-tested.
 * Services resolve the caller's role once, then call `assertCan` before acting.
 *
 *              view  comment  edit  restoreVersion  share  delete
 *   owner       ✓      ✓       ✓         ✓            ✓      ✓
 *   editor      ✓      ✓       ✓         ✓            ✗      ✗
 *   viewer      ✓      ✓       ✗         ✗            ✗      ✗
 */
import type { DocumentRole, ShareRole } from "@/server/constants";
import { ForbiddenError, NotFoundError } from "@/server/exceptions";

export type DocumentAction = "view" | "comment" | "edit" | "restoreVersion" | "share" | "delete";

const PERMISSIONS: Record<DocumentRole, ReadonlySet<DocumentAction>> = {
  owner: new Set(["view", "comment", "edit", "restoreVersion", "share", "delete"]),
  editor: new Set(["view", "comment", "edit", "restoreVersion"]),
  viewer: new Set(["view", "comment"]),
};

/**
 * The user's effective role on a document. Ownership always wins, even if a
 * stale share row exists for the owner.
 */
export function resolveRole(
  doc: { ownerId: string },
  userId: string,
  shareRole: ShareRole | null,
): DocumentRole | null {
  if (doc.ownerId === userId) return "owner";
  return shareRole ?? null;
}

export function can(role: DocumentRole | null, action: DocumentAction): boolean {
  return role !== null && PERMISSIONS[role].has(action);
}

/**
 * Throws when the action is not allowed.
 * - No access at all → 404, so we never reveal that a private document exists.
 * - Has access but lacks this permission → 403, so the UI can explain why.
 */
export function assertCan(role: DocumentRole | null, action: DocumentAction): void {
  if (role === null) throw new NotFoundError("Document");
  if (!can(role, action)) throw new ForbiddenError();
}
