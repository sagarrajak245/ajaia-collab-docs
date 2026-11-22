/**
 * API request/response contract shared by server and client.
 *
 * Success:  { data: T }
 * Failure:  { error: { code, message, details? } }
 */
import type { ErrorCode } from "@/server/constants/error-codes";

export interface ApiSuccessBody<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;
