/**
 * File import flow (two steps, the browser never sends file bytes to our API):
 *
 *  1. sign():             validate the declared file, record a pending row and hand
 *                         the browser a signed upload token for a server-chosen path.
 *  2. importToDocument(): download the uploaded object, RE-validate it from its real
 *                         bytes (size + content sniffing), convert it to TipTap JSON
 *                         and create a document owned by the caller.
 *
 * Declared name/type/size are only hints from the client; step 2 trusts nothing.
 */
import { randomUUID } from "node:crypto";
import { ALLOWED_MIME_BY_EXTENSION, SUPPORTED_UPLOAD_EXTENSIONS, UPLOAD_MAX_BYTES, type UploadExtension } from "@/server/constants/upload";
import { DOCUMENT_LIMITS } from "@/server/constants";
import { NotFoundError, PayloadTooLargeError, UnsupportedFileTypeError } from "@/server/exceptions";
import { convertToTiptap } from "@/server/lib/converters";
import { detectFileKind } from "@/server/lib/file-sniffer";
import type { StorageAdapter } from "@/server/lib/storage";
import type { UploadRepository } from "@/server/repositories/upload.repository";
import type { ImportUploadInput, SignUploadInput } from "@/server/validators/upload.validator";
import type { DocumentDetail } from "@/types/domain";
import type { DocumentService } from "./document.service";

const TITLE_MAX = 200;

/** "My Notes.final.md" -> { base: "My Notes.final", ext: "md" } */
function splitName(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot + 1).toLowerCase() };
}

export class UploadService {
  constructor(
    private readonly uploads: UploadRepository,
    private readonly documents: DocumentService,
    private readonly storage: StorageAdapter,
  ) {}

  async sign(userId: string, input: SignUploadInput) {
    const { ext } = splitName(input.fileName);
    if (!(SUPPORTED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new UnsupportedFileTypeError("Only .txt, .md and .docx files can be imported");
    }
    if (!ALLOWED_MIME_BY_EXTENSION[ext as UploadExtension].includes(input.mimeType)) {
      throw new UnsupportedFileTypeError("The file type does not match its extension");
    }
    if (input.size > UPLOAD_MAX_BYTES) throw new PayloadTooLargeError("The file is too large");

    // Server-chosen path: the client can't pick where it writes, and the user id
    // prefix keeps each user's objects separate.
    const path = `${userId}/${randomUUID()}.${ext}`;
    const signed = await this.storage.createSignedUpload(path);
    const row = await this.uploads.insert({
      ownerId: userId,
      storagePath: path,
      originalName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
    });
    return { uploadId: row.id, path, token: signed.token, bucket: this.storage.bucket };
  }

  async importToDocument(userId: string, input: ImportUploadInput): Promise<DocumentDetail> {
    const row = await this.uploads.findOwned(input.uploadId, userId);
    // Same 404 whether it doesn't exist, belongs to someone else or was already used.
    if (!row || row.status !== "pending") throw new NotFoundError("Upload");
    // Claim first so two concurrent imports can't create two documents.
    if (!(await this.uploads.claimPending(row.id))) throw new NotFoundError("Upload");

    try {
      const bytes = await this.storage.downloadObject(row.storagePath);
      // Re-check the REAL size: the declared one came from the client.
      if (bytes.length > UPLOAD_MAX_BYTES) throw new PayloadTooLargeError("The file is too large");
      const kind = detectFileKind(bytes, splitName(row.storagePath).ext);
      const content = await convertToTiptap(kind, bytes);

      const title = (splitName(row.originalName).base.trim() || DOCUMENT_LIMITS.DEFAULT_TITLE).slice(0, TITLE_MAX);
      const doc = await this.documents.create(userId, { title }, content);
      await this.uploads.markImported(row.id, doc.id);
      // The source file is no longer needed once converted.
      await this.storage.removeObject(row.storagePath).catch(() => undefined);
      return doc;
    } catch (err) {
      await this.uploads.markRejected(row.id);
      await this.storage.removeObject(row.storagePath).catch(() => undefined);
      throw err;
    }
  }
}
