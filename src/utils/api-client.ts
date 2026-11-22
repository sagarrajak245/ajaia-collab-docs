/**
 * Typed fetch wrapper for the client side.
 * Unwraps `{ data }` and turns `{ error }` responses into an ApiClientError
 * carrying the server's stable error code, so UI code can branch on `code`.
 */
import type { ApiErrorBody } from "@/types/api";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiClientError(0, "NETWORK_ERROR", "Network error. Check your connection.");
  }

  const body = (await res.json().catch(() => null)) as { data?: T } | ApiErrorBody | null;
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? "UNKNOWN", err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return (body as { data: T }).data;
}
