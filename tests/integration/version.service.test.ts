/**
 * Integration: VersionService against PGlite with the project's migrations.
 * Covers manual snapshots, non-destructive restore, authorization, optimistic
 * locking on restore and pruning.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { documentShares } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { ForbiddenError, VersionConflictError } from "@/server/exceptions";
import { DocumentRepository } from "@/server/repositories/document.repository";
import { VersionRepository } from "@/server/repositories/version.repository";
import { DocumentService } from "@/server/services/document.service";
import { VersionService } from "@/server/services/version.service";
import { createTestDb, createTestUser } from "../helpers/test-db";

let db: Db;
let docService: DocumentService;
let service: VersionService;
let alice: { id: string };
let bob: { id: string };

beforeAll(async () => {
  db = await createTestDb();
  const docRepo = new DocumentRepository(db);
  docService = new DocumentService(docRepo);
  service = new VersionService(new VersionRepository(db), docRepo, docService);
  alice = await createTestUser(db, "alice@test.dev");
  bob = await createTestUser(db, "bob@test.dev");
});

const content = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("VersionService (integration)", () => {
  it("manual save adds a listed, previewable version", async () => {
    const doc = await docService.create(alice.id, { title: "A" });
    await docService.update(doc.id, alice.id, { content: content("one"), version: 1 });
    await service.saveManual(doc.id, alice.id);

    const list = await service.list(doc.id, alice.id);
    const manual = list[0];
    expect(manual.createdBy.id).toBe(alice.id);
    expect((await service.get(doc.id, manual.id, alice.id)).content).toEqual(content("one"));
  });

  it("restore brings back old content and snapshots the pre-restore state", async () => {
    const doc = await docService.create(alice.id, { title: "R" });
    const v2 = await docService.update(doc.id, alice.id, { content: content("old"), version: 1 });
    await service.saveManual(doc.id, alice.id);
    const oldId = (await service.list(doc.id, alice.id))[0].id;
    const v3 = await docService.update(doc.id, alice.id, { content: content("new"), version: v2.version });
    const before = (await service.list(doc.id, alice.id)).length;

    const restored = await service.restore(doc.id, oldId, alice.id, v3.version);
    expect(restored.content).toEqual(content("old"));
    expect(restored.version).toBe(v3.version + 1);

    const after = await service.list(doc.id, alice.id);
    expect(after.length).toBe(before + 1);
    // The newest snapshot holds the state that existed just before the restore.
    expect((await service.get(doc.id, after[0].id, alice.id)).content).toEqual(content("new"));
  });

  it("viewer cannot restore", async () => {
    const doc = await docService.create(alice.id, {});
    await service.saveManual(doc.id, alice.id);
    await db.insert(documentShares).values({ documentId: doc.id, userId: bob.id, role: "viewer" });
    const vid = (await service.list(doc.id, bob.id))[0].id;
    await expect(service.restore(doc.id, vid, bob.id, 1)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stale expectedVersion raises VersionConflictError", async () => {
    const doc = await docService.create(alice.id, {});
    await service.saveManual(doc.id, alice.id);
    const vid = (await service.list(doc.id, alice.id))[0].id;
    await expect(service.restore(doc.id, vid, alice.id, 99)).rejects.toBeInstanceOf(VersionConflictError);
  });

  it("prunes to the newest 50 versions", async () => {
    const doc = await docService.create(alice.id, {});
    for (let i = 0; i < 53; i++) await service.saveManual(doc.id, alice.id);
    expect((await service.list(doc.id, alice.id)).length).toBe(50);
  });
});
