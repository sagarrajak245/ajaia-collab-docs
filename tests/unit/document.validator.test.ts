/** Validation rules for document requests: the API's first line of defence. */
import { describe, expect, it } from "vitest";
import { updateDocumentSchema, createDocumentSchema } from "@/server/validators/document.validator";

describe("createDocumentSchema", () => {
  it("trims the title", () => {
    expect(createDocumentSchema.parse({ title: "  Plan  " }).title).toBe("Plan");
  });

  it("rejects a whitespace-only title", () => {
    expect(createDocumentSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    expect(createDocumentSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
  });
});

describe("updateDocumentSchema", () => {
  const content = { type: "doc", content: [{ type: "paragraph" }] };

  it("accepts content with a version", () => {
    expect(updateDocumentSchema.safeParse({ content, version: 3 }).success).toBe(true);
  });

  it("requires a version (optimistic locking)", () => {
    expect(updateDocumentSchema.safeParse({ content }).success).toBe(false);
  });

  it("rejects an update with neither title nor content", () => {
    expect(updateDocumentSchema.safeParse({ version: 1 }).success).toBe(false);
  });

  it("rejects content that is not a TipTap doc", () => {
    expect(updateDocumentSchema.safeParse({ content: { type: "html", value: "<b>x</b>" }, version: 1 }).success).toBe(false);
  });

  it("rejects content over the size limit", () => {
    const huge = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a".repeat(1_100_000) }] }] };
    expect(updateDocumentSchema.safeParse({ content: huge, version: 1 }).success).toBe(false);
  });
});
