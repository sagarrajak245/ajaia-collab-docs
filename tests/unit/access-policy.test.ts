/**
 * Access policy: the single source of truth for "who can do what" on a document.
 * Written first (TDD): these rules are where an authorization bug would hurt most.
 */
import { describe, expect, it } from "vitest";
import {
  assertCan,
  can,
  resolveRole,
  type DocumentAction,
} from "@/server/services/access-policy";
import { ForbiddenError, NotFoundError } from "@/server/exceptions";

const OWNER = "owner-id";
const OTHER = "other-id";

describe("resolveRole", () => {
  it("returns owner when the user owns the document", () => {
    expect(resolveRole({ ownerId: OWNER }, OWNER, null)).toBe("owner");
  });

  it("returns the share role for a user the document is shared with", () => {
    expect(resolveRole({ ownerId: OWNER }, OTHER, "editor")).toBe("editor");
    expect(resolveRole({ ownerId: OWNER }, OTHER, "viewer")).toBe("viewer");
  });

  it("returns null when the user has no access", () => {
    expect(resolveRole({ ownerId: OWNER }, OTHER, null)).toBeNull();
  });

  it("ownership wins over a (stale) share row for the same user", () => {
    expect(resolveRole({ ownerId: OWNER }, OWNER, "viewer")).toBe("owner");
  });
});

describe("can", () => {
  const matrix: Array<[DocumentAction, owner: boolean, editor: boolean, viewer: boolean]> = [
    ["view", true, true, true],
    ["comment", true, true, true],
    ["edit", true, true, false],
    ["restoreVersion", true, true, false],
    ["share", true, false, false],
    ["delete", true, false, false],
  ];

  it.each(matrix)("%s → owner:%s editor:%s viewer:%s", (action, owner, editor, viewer) => {
    expect(can("owner", action)).toBe(owner);
    expect(can("editor", action)).toBe(editor);
    expect(can("viewer", action)).toBe(viewer);
  });

  it("denies every action when there is no role", () => {
    for (const [action] of matrix) expect(can(null, action)).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws NotFound (not Forbidden) when the user has no access, to avoid leaking existence", () => {
    expect(() => assertCan(null, "view")).toThrow(NotFoundError);
  });

  it("throws Forbidden when the user can see the document but lacks the permission", () => {
    expect(() => assertCan("viewer", "edit")).toThrow(ForbiddenError);
  });

  it("passes silently when allowed", () => {
    expect(() => assertCan("editor", "edit")).not.toThrow();
  });
});
