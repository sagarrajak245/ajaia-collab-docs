/**
 * Integration: DocumentService + DocumentRepository against a real Postgres
 * engine (PGlite) with the project's migrations. Covers the full lifecycle and
 * the two behaviours that protect data: authorization and optimistic locking.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { documentShares } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { ForbiddenError, NotFoundError, VersionConflictError } from "@/server/exceptions";
import { DocumentRepository } from "@/server/repositories/document.repository";
import { DocumentService } from "@/server/services/document.service";
import { createTestDb, createTestUser } from "../helpers/test-db";

let db: Db;
let service: DocumentService;
let alice: { id: string };
let bob: { id: string };
let carol: { id: string };

beforeAll(async () => {
  db = await createTestDb();
  service = new DocumentService(new DocumentRepository(db));
  alice = await createTestUser(db, "alice@test.dev");
  bob = await createTestUser(db, "bob@test.dev");
  carol = await createTestUser(db, "carol@test.dev");
});

const content = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("DocumentService (integration)", () => {
  it("creates, saves and reloads a document with formatting preserved", async () => {
    const doc = await service.create(alice.id, { title: "Spec" });
    expect(doc.role).toBe("owner");
    expect(doc.version).toBe(1);

    const rich = {
      type: "doc" as const,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi", marks: [{ type: "bold" }] }] }],
    };
    const saved = await service.update(doc.id, alice.id, { content: rich, version: 1 });
    expect(saved.version).toBe(2);

    const reloaded = await service.get(doc.id, alice.id);
    expect(reloaded.content).toEqual(rich);
  });

  it("rejects a stale save with VersionConflictError (no silent overwrite)", async () => {
    const doc = await service.create(alice.id, {});
    await service.update(doc.id, alice.id, { content: content("first"), version: 1 });
    await expect(service.update(doc.id, alice.id, { content: content("stale"), version: 1 })).rejects.toBeInstanceOf(
      VersionConflictError,
    );
    expect((await service.get(doc.id, alice.id)).content).toEqual(content("first"));
  });

  it("enforces roles: shared editor can save, viewer cannot, stranger gets 404", async () => {
    const doc = await service.create(alice.id, { title: "Shared" });
    await db.insert(documentShares).values([
      { documentId: doc.id, userId: bob.id, role: "editor" },
      { documentId: doc.id, userId: carol.id, role: "viewer" },
    ]);

    await expect(service.update(doc.id, bob.id, { title: "By Bob", version: 1 })).resolves.toMatchObject({ title: "By Bob" });
    await expect(service.update(doc.id, carol.id, { title: "By Carol", version: 2 })).rejects.toBeInstanceOf(ForbiddenError);

    const stranger = await createTestUser(db, "dave@test.dev");
    await expect(service.get(doc.id, stranger.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists owned and shared documents separately", async () => {
    const { owned, shared } = await service.listForUser(bob.id);
    expect(owned).toHaveLength(0);
    expect(shared.some((d) => d.title === "By Bob" && d.role === "editor")).toBe(true);
  });

  it("only the owner can delete", async () => {
    const doc = await service.create(alice.id, {});
    await db.insert(documentShares).values({ documentId: doc.id, userId: bob.id, role: "editor" });
    await expect(service.delete(doc.id, bob.id)).rejects.toBeInstanceOf(ForbiddenError);
    await service.delete(doc.id, alice.id);
    await expect(service.get(doc.id, alice.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
