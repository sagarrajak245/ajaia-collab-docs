import { describe, expect, it } from "vitest";
import { createCommentSchema, updateCommentSchema } from "@/server/validators/comment.validator";

describe("comment validators", () => {
  it("trims the body and accepts optional anchor fields", () => {
    const r = createCommentSchema.parse({ body: "  hello  ", anchorId: "abc", quote: "text" });
    expect(r.body).toBe("hello");
    expect(r.anchorId).toBe("abc");
  });

  it("rejects empty / whitespace-only and over-long bodies", () => {
    expect(createCommentSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(createCommentSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
    expect(createCommentSchema.safeParse({ body: "x".repeat(2000) }).success).toBe(true);
  });

  it("limits quote (500) and anchorId (64), and requires a uuid parentId", () => {
    expect(createCommentSchema.safeParse({ body: "a", quote: "q".repeat(501) }).success).toBe(false);
    expect(createCommentSchema.safeParse({ body: "a", anchorId: "a".repeat(65) }).success).toBe(false);
    expect(createCommentSchema.safeParse({ body: "a", parentId: "nope" }).success).toBe(false);
  });

  it("update requires a boolean `resolved`", () => {
    expect(updateCommentSchema.parse({ resolved: true })).toEqual({ resolved: true });
    expect(updateCommentSchema.safeParse({}).success).toBe(false);
  });
});
