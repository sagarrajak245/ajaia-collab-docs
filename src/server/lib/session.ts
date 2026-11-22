/**
 * Stateless session tokens (JWT, HS256) stored in an httpOnly cookie.
 *
 * - httpOnly: not readable by JavaScript (mitigates XSS token theft)
 * - SameSite=Lax: not sent on cross-site POSTs (mitigates CSRF)
 * - Secure in production: HTTPS only
 *
 * Edge-compatible (uses `jose`, no Node APIs), so the same verify function
 * runs inside Next.js middleware and in route handlers.
 */
import { jwtVerify, SignJWT } from "jose";
import { SESSION } from "@/server/constants";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION.MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the session payload, or null if the token is missing/invalid/expired. */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return { userId: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION.MAX_AGE_SECONDS,
};
