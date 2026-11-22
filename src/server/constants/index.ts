/**
 * Application-wide constants. Kept separate from config: these are fixed
 * product rules, not environment-dependent settings.
 */

/** Roles a user can hold on a document. `owner` is implicit (documents.owner_id). */
export const DOCUMENT_ROLES = ["owner", "editor", "viewer"] as const;
export type DocumentRole = (typeof DOCUMENT_ROLES)[number];

/** Roles that can be granted through sharing (ownership is never shared). */
export const SHARE_ROLES = ["editor", "viewer"] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];

export const DOCUMENT_LIMITS = {
  TITLE_MAX_LENGTH: 200,
  DEFAULT_TITLE: "Untitled document",
  /** Max serialized size of editor JSON content, in bytes (~1 MB). */
  CONTENT_MAX_BYTES: 1_000_000,
} as const;

export const VERSION_LIMITS = {
  /** Autosave creates at most one snapshot per this interval. */
  AUTO_SNAPSHOT_INTERVAL_MS: 5 * 60 * 1000,
  /** Older versions beyond this count are pruned. */
  MAX_VERSIONS_PER_DOCUMENT: 50,
} as const;

export const COMMENT_LIMITS = {
  BODY_MAX_LENGTH: 2000,
} as const;

export const SESSION = {
  COOKIE_NAME: "ajaia_session",
  /** Session lifetime: 7 days. */
  MAX_AGE_SECONDS: 60 * 60 * 24 * 7,
} as const;

export * from "./error-codes";
export * from "./upload";
