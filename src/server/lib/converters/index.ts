import type { UploadExtension } from "@/server/constants/upload";
import type { EditorContent } from "@/types/domain";
import { docxToMarkdown } from "./docx-to-markdown";
import { markdownToTiptap } from "./markdown-to-tiptap";
import { txtToTiptap } from "./txt-to-tiptap";

/** Converts verified file bytes to TipTap JSON. Everything funnels through Markdown. */
export async function convertToTiptap(kind: UploadExtension, bytes: Uint8Array): Promise<EditorContent> {
  if (kind === "docx") return markdownToTiptap(await docxToMarkdown(bytes));
  const text = new TextDecoder("utf-8").decode(bytes);
  return kind === "md" ? markdownToTiptap(text) : txtToTiptap(text);
}
