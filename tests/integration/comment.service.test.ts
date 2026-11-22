/**
 * Integration: CommentService + repository on PGlite. Covers the authorization
 * matrix (viewer may comment, stranger gets 404), thread rules and deletion rights.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { documentShares } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/exceptions";
import { CommentRepository } from "@/server/repositories/comment.repository";
import { DocumentRepository } from "@/server/repositories/document.repository";
import { CommentService } from "@/server/services/comment.service";
import { DocumentService } from "@/server/services/document.service";
import { createTestDb, createTestUser } from "../helpers/test-db";

let db: Db;
let comments: CommentService;
let docs: DocumentService;
let owner: { id: string };
let viewer: { id: string };
let editor: { id: string };
let stranger: { id: string };
let docId: string;

beforeAll(async () => {
  db = await createTestDb();
  docs = new DocumentService(new DocumentRepository(db));
  comments = new CommentService(new CommentRepository(db), docs);
  owner = await createTestUser(db, "owner@test.dev");
  viewer = await createTestUser(db, "viewer@test.dev");
  editor = await createTestUser(db, "editor@test.dev");
  stranger = await createTestUser(db, "stranger@test.dev");
  docId = (await docs.create(owner.id, { title: "Spec" })).id;
  await db.insert(documentShares).values([
    { documentId: docId, userId: viewer.id, role: "viewer" },
    { documentId: docId, userId: editor.id, role: "editor" },
  ]);
});

describe("CommentService (integration)", () => {
  it("lets a viewer comment, with author joined and oldest-first listing", async () => {
    const a = await comments.create(docId, owner.id, { body: "first", anchorId: "a1", quote: "Hello" });
    const b = await comments.create(docId, viewer.id, { body: "second" });
    const list = await comments.list(docId, viewer.id);
    expect(list.map((c) => c.id)).toEqual([a.id, b.id]);
    expect(list[1].author.id).toBe(viewer.id);
    expect(list[0].anchorId).toBe("a1");
    expect(list[0].quote).toBe("Hello");
  });

  it("hides the document from strangers (404)", async () => {
    await expect(comments.list(docId, stranger.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(comments.create(docId, stranger.id, { body: "x" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows replies to root comments only", async () => {
    const root = await comments.create(docId, editor.id, { body: "root" });
    const reply = await comments.create(docId, viewer.id, { body: "reply", parentId: root.id });
    expect(reply.parentId).toBe(root.id);
    await expect(
      comments.create(docId, viewer.id, { body: "nested", parentId: reply.id }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      comments.create(docId, viewer.id, { body: "ghost", parentId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("toggles resolved on root comments only", async () => {
    const root = await comments.create(docId, editor.id, { body: "to resolve" });
    const reply = await comments.create(docId, editor.id, { body: "r", parentId: root.id });
    expect((await comments.setResolved(docId, viewer.id, root.id, true)).resolved).toBe(true);
    expect((await comments.setResolved(docId, viewer.id, root.id, false)).resolved).toBe(false);
    await expect(comments.setResolved(docId, viewer.id, reply.id, true)).rejects.toBeInstanceOf(ValidationError);
  });

  it("only the author or document owner can delete; replies cascade", async () => {
    const root = await comments.create(docId, editor.id, { body: "mine" });
    await comments.create(docId, viewer.id, { body: "child", parentId: root.id });
    await expect(comments.delete(docId, viewer.id, root.id)).rejects.toBeInstanceOf(ForbiddenError);
    await comments.delete(docId, owner.id, root.id); // owner may moderate
    const left = await comments.list(docId, owner.id);
    expect(left.some((c) => c.id === root.id || c.parentId === root.id)).toBe(false);

    const own = await comments.create(docId, viewer.id, { body: "viewer's own" });
    await comments.delete(docId, viewer.id, own.id); // author may delete
    await expect(comments.delete(docId, viewer.id, own.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
