/**
 * Database schema (single source of truth).
 *
 * Changed ONLY through versioned Drizzle migrations:
 *   npm run db:generate  -> writes SQL to src/server/db/migrations
 *   npm run db:migrate   -> applies pending migrations
 *
 * All tables are defined up front so parallel feature work never conflicts on schema.
 */
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const shareRoleEnum = pgEnum("share_role", ["editor", "viewer"]);
export const uploadStatusEnum = pgEnum("upload_status", ["pending", "imported", "rejected"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ----------------------------------------------------------------- users */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------- documents */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** TipTap/ProseMirror JSON: preserves structure + formatting exactly. */
    content: jsonb("content").notNull(),
    /** Optimistic-lock counter, incremented on every content/title save. */
    version: integer("version").notNull().default(1),
    /** Last time an automatic version snapshot was taken (throttling). */
    lastSnapshotAt: timestamp("last_snapshot_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_owner_id_idx").on(t.ownerId)],
);

/* ------------------------------------------------------- document_shares */
export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRoleEnum("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // One share per (document, user): re-sharing updates the role instead.
    uniqueIndex("document_shares_document_user_uq").on(t.documentId, t.userId),
    index("document_shares_user_id_idx").on(t.userId),
  ],
);

/* ----------------------------------------------------- document_versions */
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("document_versions_document_created_idx").on(t.documentId, t.createdAt)],
);

/* -------------------------------------------------------------- comments */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Id stored in the editor's comment mark; links the thread to a text range. */
    anchorId: text("anchor_id"),
    /** Snapshot of the highlighted text when the comment was made. */
    quote: text("quote"),
    body: text("body").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    /** Replies point to their root comment. */
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("comments_document_id_idx").on(t.documentId)],
);

/* --------------------------------------------------------------- uploads */
export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Server-generated object path in Supabase Storage: {userId}/{uuid}.{ext} */
  storagePath: text("storage_path").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  status: uploadStatusEnum("status").notNull().default("pending"),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------- relations */
export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, { fields: [documents.ownerId], references: [users.id] }),
  shares: many(documentShares),
}));

export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, { fields: [documentShares.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentShares.userId], references: [users.id] }),
}));

/* ----------------------------------------------------------- row types */
export type UserRow = typeof users.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentShareRow = typeof documentShares.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type UploadRow = typeof uploads.$inferSelect;
