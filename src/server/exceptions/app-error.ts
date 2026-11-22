/**
 * Typed application exceptions.
 *
 * Services throw these instead of returning error values or building HTTP
 * responses. The API wrapper (server/middleware/api-handler.ts) catches them
 * and maps each one to the standard error envelope + HTTP status. Business
 * logic therefore stays HTTP-agnostic and easy to unit test.
 */
import { ERROR_CODES, type ErrorCode } from "@/server/constants/error-codes";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: unknown) {
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "You must be logged in") {
    super(ERROR_CODES.UNAUTHENTICATED, message, 401);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    // Deliberately generic: never reveal whether the email exists.
    super(ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this") {
    super(ERROR_CODES.FORBIDDEN, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.CONFLICT, message, 409, details);
  }
}

/** Optimistic-locking failure: someone saved the document since the client loaded it. */
export class VersionConflictError extends AppError {
  constructor(currentVersion: number) {
    super(
      ERROR_CODES.VERSION_CONFLICT,
      "This document was updated elsewhere. Reload to get the latest version.",
      409,
      { currentVersion },
    );
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.PAYLOAD_TOO_LARGE, message, 413);
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.UNSUPPORTED_FILE_TYPE, message, 415);
  }
}

export class InvalidFileContentError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.INVALID_FILE_CONTENT, message, 422);
  }
}
