/**
 * Access policy (stub for TDD RED step: implemented next).
 */
import type { DocumentRole, ShareRole } from "@/server/constants";

export type DocumentAction = "view" | "comment" | "edit" | "restoreVersion" | "share" | "delete";

export function resolveRole(
  _doc: { ownerId: string },
  _userId: string,
  _shareRole: ShareRole | null,
): DocumentRole | null {
  return null;
}

export function can(_role: DocumentRole | null, _action: DocumentAction): boolean {
  return false;
}

export function assertCan(_role: DocumentRole | null, _action: DocumentAction): void {}
