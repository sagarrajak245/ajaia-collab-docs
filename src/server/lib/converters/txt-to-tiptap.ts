/** Plain text -> TipTap JSON: blank lines separate paragraphs, single newlines become hard breaks. */
import type { EditorContent } from "@/types/domain";
import type { TNode } from "./markdown-to-tiptap";

export function txtToTiptap(text: string): EditorContent {
  const paragraphs: TNode[] = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.replace(/^\n+|\n+$/g, ""))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const content: TNode[] = [];
      chunk.split("\n").forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return { type: "paragraph", content };
    });
  return { type: "doc", content: paragraphs.length ? paragraphs : [{ type: "paragraph" }] } as unknown as EditorContent;
}
