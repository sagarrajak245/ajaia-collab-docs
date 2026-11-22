import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { uploads } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { InvalidFileContentError, NotFoundError } from "@/server/exceptions";
import type { StorageAdapter } from "@/server/lib/storage";
import { DocumentRepository } from "@/server/repositories/document.repository";
import { UploadRepository } from "@/server/repositories/upload.repository";
import { DocumentService } from "@/server/services/document.service";
import { UploadService } from "@/server/services/upload.service";
import { createTestDb, createTestUser } from "../helpers/test-db";

/** In-memory stand-in for Supabase Storage: tests "upload" by writing to the map. */
function fakeStorage() {
  const objects = new Map<string, Uint8Array>();
  const adapter: StorageAdapter = {
    bucket: "test-bucket",
    async createSignedUpload(path) {
      return { path, token: "tok", signedUrl: `http://fake/${path}` };
    },
    async downloadObject(path) {
      const o = objects.get(path);
      if (!o) throw new Error("missing object");
      return o;
    },
    async removeObject(path) {
      objects.delete(path);
    },
  };
  return { adapter, objects };
}

describe("UploadService", () => {
  let db: Db;
  let service: UploadService;
  let objects: Map<string, Uint8Array>;
  let userId: string;
  let otherId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const fake = fakeStorage();
    objects = fake.objects;
    service = new UploadService(new UploadRepository(db), new DocumentService(new DocumentRepository(db)), fake.adapter);
    userId = (await createTestUser(db, "a@example.com")).id;
    otherId = (await createTestUser(db, "b@example.com")).id;
  });

  const signAndUpload = async (owner: string, fileName: string, body: string, mimeType = "") => {
    const bytes = new TextEncoder().encode(body);
    const signed = await service.sign(owner, { fileName, size: bytes.length, mimeType });
    objects.set(signed.path, bytes);
    return signed;
  };

  it("imports markdown into a document with a heading, titled from the filename", async () => {
    const { uploadId } = await signAndUpload(userId, "Meeting Notes.md", "# Agenda\n\nHello **team**");
    const doc = await service.importToDocument(userId, { uploadId });
    expect(doc.title).toBe("Meeting Notes");
    expect(JSON.stringify(doc.content)).toContain('"type":"heading"');
    const [row] = await db.select().from(uploads).where(eq(uploads.id, uploadId));
    expect(row.status).toBe("imported");
    expect(row.documentId).toBe(doc.id);
  });

  it("rejects a spoofed .docx, marks the row rejected and deletes the object", async () => {
    const { uploadId, path } = await signAndUpload(userId, "fake.docx", "just text pretending to be word");
    await expect(service.importToDocument(userId, { uploadId })).rejects.toBeInstanceOf(InvalidFileContentError);
    const [row] = await db.select().from(uploads).where(eq(uploads.id, uploadId));
    expect(row.status).toBe("rejected");
    expect(objects.has(path)).toBe(false);
  });

  it("returns NotFound for another user's upload", async () => {
    const { uploadId } = await signAndUpload(userId, "a.txt", "hi");
    await expect(service.importToDocument(otherId, { uploadId })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("cannot import the same upload twice", async () => {
    const { uploadId } = await signAndUpload(userId, "a.txt", "hi");
    await service.importToDocument(userId, { uploadId });
    await expect(service.importToDocument(userId, { uploadId })).rejects.toBeInstanceOf(NotFoundError);
  });
});
