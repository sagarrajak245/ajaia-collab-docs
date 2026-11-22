/** POST /api/auth/logout: clear the session cookie. */
import { NextResponse } from "next/server";
import { SESSION } from "@/server/constants";
import { apiHandler } from "@/server/middleware/api-handler";

export const POST = apiHandler({ auth: false }, async () => {
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION.COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
});
