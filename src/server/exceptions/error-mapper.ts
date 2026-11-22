/**
 * Central mapping from any thrown value to the standard API error envelope.
 * Unknown errors become a generic 500 so internal details never leak.
 */
import { ZodError } from "zod";
import { ERROR_CODES } from "@/server/constants/error-codes";
import type { ApiErrorBody } from "@/types/api";
import { AppError } from "./app-error";

export interface MappedError {
  status: number;
  body: ApiErrorBody;
  /** True for unexpected errors that should be logged at error level. */
  unexpected: boolean;
}

export function mapError(err: unknown): MappedError {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.message, details: err.details } },
      unexpected: false,
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid request",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      unexpected: false,
    };
  }
  return {
    status: 500,
    body: { error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Something went wrong" } },
    unexpected: true,
  };
}
