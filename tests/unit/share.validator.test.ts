/** Unit: share request validation (pure zod schemas, no I/O). */
import { describe, expect, it } from "vitest";
import {
  createShareSchema,
  shareParamsSchema,
  updateShareSchema,
} from "@/server/validators/share.validator";

describe("share validators", () => {
  it("accepts a valid email + role and normalizes the email", () => {
    const r = createShareSchema.parse({ email: "  Bob@Test.DEV ", role: "editor" });
    expect(r).toEqual({ email: "bob@test.dev", role: "editor" });
  });

  it("rejects malformed emails", () => {
    expect(createShareSchema.safeParse({ email: "not-an-email", role: "viewer" }).success).toBe(false);
  });

  it("rejects 'owner' and unknown roles (ownership is never shareable)", () => {
    expect(createShareSchema.safeParse({ email: "a@b.dev", role: "owner" }).success).toBe(false);
    expect(updateShareSchema.safeParse({ role: "admin" }).success).toBe(false);
    expect(updateShareSchema.safeParse({ role: "viewer" }).success).toBe(true);
  });

  it("requires uuid route params", () => {
    expect(shareParamsSchema.safeParse({ id: "nope" }).success).toBe(false);
    expect(
      shareParamsSchema.safeParse({ id: crypto.randomUUID(), shareId: crypto.randomUUID() }).success,
    ).toBe(true);
  });
});
