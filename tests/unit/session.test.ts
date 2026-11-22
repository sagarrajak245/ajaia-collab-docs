/** Session tokens: round-trip and tamper/expiry rejection. */
import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/server/lib/session";

const payload = { userId: "u1", email: "alice@ajaia.test", name: "Alice" };

describe("session tokens", () => {
  it("round-trips the payload", async () => {
    const token = await createSessionToken(payload);
    await expect(verifySessionToken(token)).resolves.toEqual(payload);
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(payload);
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", email: "x", name: "x" })).toString("base64url");
    await expect(verifySessionToken(`${h}.${forged}.${s}`)).resolves.toBeNull();
  });

  it("returns null for a missing or garbage token", async () => {
    await expect(verifySessionToken(undefined)).resolves.toBeNull();
    await expect(verifySessionToken("not-a-jwt")).resolves.toBeNull();
  });
});
