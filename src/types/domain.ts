/**
 * Domain DTOs shared between server responses and client components.
 * Type-only module: no runtime code.
 */
import type { DocumentRole, ShareRole } from "@/server/constants";

/**
 * TipTap/ProseMirror document JSON. Kept loose (the editor owns the node shape)
 * but structurally compatible with TipTap's `JSONContent`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EditorNode = Record<string, any>;
export interface EditorContent {
  type: "doc";
  content?: EditorNode[];
  [key: string]: unknown;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
}

/** Dashboard list item. */
export interface DocumentSummary {
  id: string;
  title: string;
  owner: UserSummary;
  /** The current user's role on this document. */
  role: DocumentRole;
  updatedAt: string;
}

/** Full document as loaded by the editor. */
export interface DocumentDetail extends DocumentSummary {
  content: EditorContent;
  /** Optimistic-lock version; must be sent back on save. */
  version: number;
  createdAt: string;
}

export interface DocumentShareDto {
  id: string;
  user: UserSummary;
  role: ShareRole;
  createdAt: string;
}

export interface DocumentVersionDto {
  id: string;
  title: string;
  createdBy: UserSummary;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  documentId: string;
  author: UserSummary;
  anchorId: string | null;
  quote: string | null;
  body: string;
  resolved: boolean;
  parentId: string | null;
  createdAt: string;
}
