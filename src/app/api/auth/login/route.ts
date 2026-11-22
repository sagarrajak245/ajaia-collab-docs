/** POST /api/auth/login: verify credentials, set the httpOnly session cookie. */
import { NextResponse } from "next/server";
import { getContainer } from "@/server/container";
import { SESSION } from "@/server/constants";
import { sessionCookieOptions } from "@/server/lib/session";
import { apiHandler } from "@/server/middleware/api-handler";
import { loginSchema } from "@/server/validators/auth.validator";

export const POST = apiHandler({ auth: false, body: loginSchema }, async ({ body }) => {
  const { user, token } = await getContainer().authService.login(body);
  const res = NextResponse.json({ data: { user } });
  res.cookies.set(SESSION.COOKIE_NAME, token, sessionCookieOptions);
  return res;
});
