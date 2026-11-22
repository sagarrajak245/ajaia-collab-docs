/**
 * File-upload rules. The same constants drive server validation AND the
 * limits shown in the upload dialog, so the UI can never drift from the API.
 */
export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const SUPPORTED_UPLOAD_EXTENSIONS = ["txt", "md", "docx"] as const;
export type UploadExtension = (typeof SUPPORTED_UPLOAD_EXTENSIONS)[number];

/**
 * MIME types browsers commonly report per extension. Used only as a first,
 * cheap check: the real type is verified later by sniffing the file bytes.
 * Empty string is allowed because some browsers/OSes report no type for .md.
 */
export const ALLOWED_MIME_BY_EXTENSION: Record<UploadExtension, readonly string[]> = {
  txt: ["text/plain", ""],
  md: ["text/markdown", "text/x-markdown", "text/plain", ""],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "",
  ],
};

/** ZIP local-file-header signature "PK\x03\x04": every .docx is a ZIP archive. */
export const ZIP_MAGIC_BYTES = [0x50, 0x4b, 0x03, 0x04] as const;

/** Signed upload URLs are short-lived (Supabase default is 2 h; we validate on import). */
export const UPLOAD_HUMAN_LIMITS = "Supported: .txt, .md, .docx · Max 2 MB";
