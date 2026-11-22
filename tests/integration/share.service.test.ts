/**
 * Integration: ShareService against PGlite with real migrations. Verifies the
 * sharing contract end to end: recipient visibility, role updates, guards, revoke.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/types";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/exceptions";
import { DocumentRepository } from "@/server/repositories/document.repository";
import { ShareRepository } from "@/server/repositories/share.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { DocumentService } from "@/server/services/document.service";
import { ShareService } from "@/server/services/share.service";
import { createTestDb, createTestUser } from "../helpers/test-db";

let docs: DocumentService;
let shares: ShareService;
let alice: { id: string };
let bob: { id: string };
let carol: { id: string };

beforeAll(async () => {
  const db: Db = await createTestDb();
  docs = new DocumentService(new DocumentRepository(db));
  shares = new ShareService(new ShareRepository(db), new UserRepository(db), docs);
  alice = await createTestUser(db, "alice@test.dev");
  bob = await createTestUser(db, "bob@test.dev");
  carol = await createTestUser(db, "carol@test.dev");
});

describe("ShareService (integration)", () => {
  it("shared document appears in the recipient's 'shared' list with the granted role", async () => {
    const doc = await docs.create(alice.id, { title: "Plan" });
    await shares.share(doc.id, alice.id, { email: "bob@test.dev", role: "viewer" });

    const { shared } = await docs.listForUser(bob.id);
    expect(shared.find((d) => d.id === doc.id)?.role).toBe("viewer");
    expect((await shares.list(doc.id, alice.id)).map((s) => s.user.email)).toContain("bob@test.dev");
  });

  it("re-sharing with the same user updates the role instead of duplicating", async () => {
    const doc = await docs.create(alice.id, {});
    await shares.share(doc.id, alice.id, { email: "bob@test.dev", role: "viewer" });
    await shares.share(doc.id, alice.id, { email: "bob@test.dev", role: "editor" });

    const list = await shares.list(doc.id, alice.id);
    expect(list).toHaveLength(1);
    expect(list[0].role).toBe("editor");
  });

  it("rejects sharing with yourself (the owner)", async () => {
    const doc = await docs.create(alice.id, {});
    await expect(shares.share(doc.id, alice.id, { email: "alice@test.dev", role: "editor" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("returns NotFound for an unknown recipient email", async () => {
    const doc = await docs.create(alice.id, {});
    await expect(shares.share(doc.id, alice.id, { email: "ghost@test.dev", role: "viewer" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("forbids non-owners from sharing, even editors", async () => {
    const doc = await docs.create(alice.id, {});
    await shares.share(doc.id, alice.id, { email: "bob@test.dev", role: "editor" });
    await expect(shares.share(doc.id, bob.id, { email: "carol@test.dev", role: "viewer" })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("revoke removes access: the former recipient gets NotFound", async () => {
    const doc = await docs.create(alice.id, {});
    const share = await shares.share(doc.id, alice.id, { email: "carol@test.dev", role: "viewer" });
    await expect(docs.get(doc.id, carol.id)).resolves.toBeDefined();

    await shares.revoke(doc.id, share.id, alice.id);
    await expect(docs.get(doc.id, carol.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("revoke/update reject a share id that belongs to another document", async () => {
    const d1 = await docs.create(alice.id, {});
    const d2 = await docs.create(alice.id, {});
    const s = await shares.share(d1.id, alice.id, { email: "bob@test.dev", role: "viewer" });
    await expect(shares.revoke(d2.id, s.id, alice.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(shares.updateRole(d2.id, s.id, alice.id, "editor")).rejects.toBeInstanceOf(NotFoundError);
  });
});
