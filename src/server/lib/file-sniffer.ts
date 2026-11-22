/**
 * Content sniffing for uploaded files.
 *
 * The filename extension and the browser-reported MIME type are attacker
 * controlled, so we never trust them alone: we inspect the actual bytes and
 * confirm they match what the extension claims.
 */
import {
  SUPPORTED_UPLOAD_EXTENSIONS,
  UPLOAD_MAX_BYTES,
  ZIP_MAGIC_BYTES,
  type UploadExtension,
} from "@/server/constants/upload";
import { InvalidFileContentError, PayloadTooLargeError, UnsupportedFileTypeError } from "@/server/exceptions";

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const PDF_MAGIC = ascii("%PDF");
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const DOCX_MARKER = ascii("word/document.xml");

const startsWith = (bytes: Uint8Array, magic: readonly number[]) => magic.every((b, i) => bytes[i] === b);

/** Naive byte-sequence search (files are capped at 2 MB, so this is cheap). */
function contains(bytes: Uint8Array, needle: readonly number[]): boolean {
  const last = bytes.length - needle.length;
  outer: for (let i = 0; i <= last; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Returns the verified file kind, or throws:
 *  415 unsupported extension, 413 too large, 422 empty / content does not match extension.
 */
export function detectFileKind(bytes: Uint8Array, declaredExt: string): UploadExtension {
  const ext = declaredExt.toLowerCase() as UploadExtension;
  if (!SUPPORTED_UPLOAD_EXTENSIONS.includes(ext)) {
    throw new UnsupportedFileTypeError(`Unsupported file type ".${declaredExt}"`);
  }
  if (bytes.length === 0) throw new InvalidFileContentError("The file is empty");
  if (bytes.length > UPLOAD_MAX_BYTES) throw new PayloadTooLargeError("The file is too large");

  if (ext === "docx") {
    // A real .docx is a ZIP that contains word/document.xml (stored uncompressed in the entry name).
    if (!startsWith(bytes, ZIP_MAGIC_BYTES) || !contains(bytes, DOCX_MARKER)) {
      throw new InvalidFileContentError("The file is not a valid .docx document");
    }
    return ext;
  }

  // txt / md: must be text. Reject known binary signatures, NUL bytes and invalid UTF-8.
  if (startsWith(bytes, ZIP_MAGIC_BYTES) || startsWith(bytes, PDF_MAGIC) || startsWith(bytes, PNG_MAGIC)) {
    throw new InvalidFileContentError("The file content is binary, not text");
  }
  if (bytes.includes(0)) throw new InvalidFileContentError("The file content is binary, not text");
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new InvalidFileContentError("The file is not valid UTF-8 text");
  }
  return ext;
}
