/**
 * Page-level auth guard (Next.js middleware, runs on the Edge).
 *
 * - Unauthenticated users visiting app pages are redirected to /login?next=...
 * - Logged-in users visiting /login are sent to /documents.
 * API routes are NOT handled here: they return proper 401 JSON via apiHandler.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION } from "@/server/constants";
import { verifySessionToken } from "@/server/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySessionToken(req.cookies.get(SESSION.COOKIE_NAME)?.value);

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/documents", req.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
