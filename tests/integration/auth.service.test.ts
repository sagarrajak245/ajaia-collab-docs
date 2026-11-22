/** Integration: AuthService + UserRepository on PGlite. */
import { beforeAll, describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/server/exceptions";
import { verifySessionToken } from "@/server/lib/session";
import { UserRepository } from "@/server/repositories/user.repository";
import { AuthService } from "@/server/services/auth.service";
import { createTestDb, createTestUser } from "../helpers/test-db";

let auth: AuthService;

beforeAll(async () => {
  const db = await createTestDb();
  await createTestUser(db, "alice@test.dev");
  auth = new AuthService(new UserRepository(db));
});

describe("AuthService.login (integration)", () => {
  it("returns the user and a valid session token for correct credentials", async () => {
    const { user, token } = await auth.login({ email: "alice@test.dev", password: "password123" });
    expect(user.email).toBe("alice@test.dev");
    expect((await verifySessionToken(token))?.userId).toBe(user.id);
  });

  it("rejects a wrong password and an unknown email with the same error", async () => {
    await expect(auth.login({ email: "alice@test.dev", password: "nope" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(auth.login({ email: "ghost@test.dev", password: "nope" })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
