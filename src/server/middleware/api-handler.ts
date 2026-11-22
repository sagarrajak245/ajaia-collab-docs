/**
 * API route wrapper: the "interceptor" every route handler goes through.
 *
 * Responsibilities (in order):
 *   1. Assign a request id (echoed in the `x-request-id` response header).
 *   2. Resolve the session from the cookie; reject with 401 when auth is required.
 *   3. Validate route params, query and JSON body against zod schemas.
 *   4. Run the handler and wrap its return value as `{ data }`.
 *   5. Catch ANY thrown error and map it to the standard error envelope.
 *   6. Log method, path, status and duration (+ stack for unexpected errors).
 *
 * Because these concerns live in one place, no endpoint can forget auth,
 * validation or consistent error formatting. Route files stay a few lines long.
 */
import { NextResponse, type NextRequest } from "next/server";
import type { z, ZodType } from "zod";
import { SESSION } from "@/server/constants";
import { mapError, UnauthenticatedError, ValidationError } from "@/server/exceptions";
import { logger } from "@/server/lib/logger";
import { verifySessionToken, type SessionPayload } from "@/server/lib/session";

type Infer<S> = S extends ZodType ? z.infer<S> : undefined;

interface HandlerOptions<
  B extends ZodType | undefined,
  Q extends ZodType | undefined,
  P extends ZodType | undefined,
> {
  /** Require a logged-in user (default: true). */
  auth?: boolean;
  body?: B;
  query?: Q;
  params?: P;
  /** HTTP status for successful responses (default 200). */
  successStatus?: number;
}

export interface HandlerContext<B, Q, P, A extends boolean> {
  req: NextRequest;
  requestId: string;
  user: A extends false ? SessionPayload | null : SessionPayload;
  body: B;
  query: Q;
  params: P;
}

/** Route handlers may return plain data, or a raw Response (e.g. file downloads, cookies). */
type HandlerResult = unknown;

type RouteContext = { params: Promise<Record<string, string | string[]>> };

export function apiHandler<
  B extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  A extends boolean = true,
>(
  options: HandlerOptions<B, Q, P> & { auth?: A },
  handler: (ctx: HandlerContext<Infer<B>, Infer<Q>, Infer<P>, A>) => Promise<HandlerResult>,
) {
  return async (req: NextRequest, routeCtx: RouteContext): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    const path = req.nextUrl.pathname;
    let status = 500;

    try {
      // 2. Authentication
      const user = await verifySessionToken(req.cookies.get(SESSION.COOKIE_NAME)?.value);
      if (options.auth !== false && !user) throw new UnauthenticatedError();

      // 3. Validation
      const rawParams = routeCtx?.params ? await routeCtx.params : {};
      const params = options.params ? options.params.parse(rawParams) : undefined;
      const query = options.query
        ? options.query.parse(Object.fromEntries(req.nextUrl.searchParams))
        : undefined;
      let body: unknown = undefined;
      if (options.body) {
        let json: unknown;
        try {
          json = await req.json();
        } catch {
          throw new ValidationError("Request body must be valid JSON");
        }
        body = options.body.parse(json);
      }

      // 4. Handler
      const result = await handler({
        req,
        requestId,
        user: user as HandlerContext<Infer<B>, Infer<Q>, Infer<P>, A>["user"],
        body: body as Infer<B>,
        query: query as Infer<Q>,
        params: params as Infer<P>,
      });

      const response =
        result instanceof Response
          ? result
          : NextResponse.json({ data: result ?? null }, { status: options.successStatus ?? 200 });
      status = response.status;
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err) {
      // 5. Error mapping
      const mapped = mapError(err);
      status = mapped.status;
      if (mapped.unexpected) {
        logger.error("Unhandled error", {
          requestId,
          path,
          error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
        });
      }
      return NextResponse.json(mapped.body, {
        status: mapped.status,
        headers: { "x-request-id": requestId },
      });
    } finally {
      // 6. Access log
      logger.info("request", { requestId, method: req.method, path, status, ms: Date.now() - started });
    }
  };
}
