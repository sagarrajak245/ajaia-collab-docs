/**
 * Markdown -> TipTap (ProseMirror) JSON. Every import format funnels through here:
 * .md directly, .docx via mammoth's Markdown output, .txt via its own tiny converter.
 */
import { marked, type Token, type Tokens } from "marked";
import type { EditorContent } from "@/types/domain";

// Loose node shape; the editor schema validates on load.
export interface TNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TNode[];
  marks?: { type: string }[];
  text?: string;
}

const MAX_HEADING = 3;

/** Inline tokens -> text nodes carrying the accumulated marks. */
function inline(tokens: Token[] | undefined, marks: string[] = []): TNode[] {
  const out: TNode[] = [];
  const withMarks = (text: string, extra: string[] = []): TNode => {
    const all = [...marks, ...extra];
    return { type: "text", text, ...(all.length ? { marks: all.map((type) => ({ type })) } : {}) };
  };
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "strong":
        out.push(...inline((t as Tokens.Strong).tokens, [...marks, "bold"]));
        break;
      case "em":
        out.push(...inline((t as Tokens.Em).tokens, [...marks, "italic"]));
        break;
      case "del":
        out.push(...inline((t as Tokens.Del).tokens, [...marks, "strike"]));
        break;
      case "codespan":
        out.push(withMarks((t as Tokens.Codespan).text, ["code"]));
        break;
      case "br":
        out.push({ type: "hardBreak" });
        break;
      case "link":
        out.push(...inline((t as Tokens.Link).tokens, marks)); // keep text, drop href
        break;
      case "image":
        break; // images are not imported
      default: {
        const nested = (t as { tokens?: Token[] }).tokens;
        const text = (t as { text?: string }).text ?? (t as { raw?: string }).raw ?? "";
        if (nested?.length) out.push(...inline(nested, marks));
        else if (text) out.push(withMarks(text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, decodeEntity)));
      }
    }
  }
  return out;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const decodeEntity = (m: string) => ENTITIES[m] ?? m;

function listItem(item: Tokens.ListItem): TNode {
  const content: TNode[] = [];
  for (const child of item.tokens) {
    // "text" tokens inside list items hold inline children: wrap them in a paragraph.
    if (child.type === "text") content.push({ type: "paragraph", content: inline((child as Tokens.Text).tokens ?? [child]) });
    else content.push(...block([child]));
  }
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "listItem", content };
}

function block(tokens: Token[]): TNode[] {
  const out: TNode[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        out.push({ type: "heading", attrs: { level: Math.min(h.depth, MAX_HEADING) }, content: inline(h.tokens) });
        break;
      }
      case "paragraph":
        out.push({ type: "paragraph", content: inline((t as Tokens.Paragraph).tokens) });
        break;
      case "list": {
        const l = t as Tokens.List;
        out.push({ type: l.ordered ? "orderedList" : "bulletList", content: l.items.map(listItem) });
        break;
      }
      case "blockquote":
        out.push({ type: "blockquote", content: block((t as Tokens.Blockquote).tokens) });
        break;
      case "code": {
        const text = (t as Tokens.Code).text;
        out.push({ type: "codeBlock", ...(text ? { content: [{ type: "text", text }] } : {}) });
        break;
      }
      case "hr":
        out.push({ type: "horizontalRule" });
        break;
      case "table": {
        const tb = t as Tokens.Table;
        const cell = (type: string, c: Tokens.TableCell): TNode => ({
          type,
          content: [{ type: "paragraph", content: inline(c.tokens) }],
        });
        out.push({
          type: "table",
          content: [
            { type: "tableRow", content: tb.header.map((c) => cell("tableHeader", c)) },
            ...tb.rows.map((r) => ({ type: "tableRow", content: r.map((c) => cell("tableCell", c)) })),
          ],
        });
        break;
      }
      case "html":
      case "space":
        break; // raw HTML is dropped on purpose (untrusted input)
      default: {
        const text = (t as { text?: string }).text;
        if (text) out.push({ type: "paragraph", content: [{ type: "text", text }] });
      }
    }
  }
  return out;
}

export function markdownToTiptap(markdown: string): EditorContent {
  const content = block(marked.lexer(markdown, { gfm: true }));
  // ProseMirror requires at least one block.
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] } as unknown as EditorContent;
}
