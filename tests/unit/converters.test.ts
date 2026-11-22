import { describe, expect, it } from "vitest";
import { markdownToTiptap } from "@/server/lib/converters/markdown-to-tiptap";
import { txtToTiptap } from "@/server/lib/converters/txt-to-tiptap";

describe("markdownToTiptap", () => {
  it("converts headings (capped at level 3), paragraphs and inline marks", () => {
    const doc = markdownToTiptap("##### Deep\n\nHello **bold** and *it* and `code`");
    expect(doc.type).toBe("doc");
    expect(doc.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 3 } });
    const para = doc.content?.[1];
    expect(para?.type).toBe("paragraph");
    const marks = para?.content?.flatMap((n: { marks?: { type: string }[] }) => (n.marks ?? []).map((m) => m.type));
    expect(marks).toEqual(expect.arrayContaining(["bold", "italic", "code"]));
  });

  it("converts lists, blockquotes, code blocks and rules", () => {
    const doc = markdownToTiptap("- a\n- b\n\n1. x\n\n> q\n\n```\ncode\n```\n\n---");
    const types = doc.content?.map((n) => n.type);
    expect(types).toEqual(["bulletList", "orderedList", "blockquote", "codeBlock", "horizontalRule"]);
    expect(doc.content?.[0].content).toHaveLength(2);
  });

  it("converts GFM tables", () => {
    const doc = markdownToTiptap("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(doc.content?.[0].type).toBe("table");
    expect(doc.content?.[0].content?.[0].content?.[0].type).toBe("tableHeader");
  });

  it("never returns an empty doc", () => {
    expect(markdownToTiptap("").content?.length).toBeGreaterThan(0);
  });
});

describe("txtToTiptap", () => {
  it("splits blank-line paragraphs and turns single newlines into hard breaks", () => {
    const doc = txtToTiptap("line1\nline2\n\npara2");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[0].content?.map((n: { type: string }) => n.type)).toEqual(["text", "hardBreak", "text"]);
  });
});
