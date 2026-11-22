/**
 * Composition root: wires repositories and services to the production database.
 *
 * Route handlers get services from here; tests build their own instances with
 * an in-memory database instead. Keeping construction in one place is what
 * makes the layers swappable.
 */
import "server-only";
import { getDb } from "@/server/db/client";
import { UserRepository } from "@/server/repositories/user.repository";
import { AuthService } from "@/server/services/auth.service";

export function getContainer() {
  const db = getDb();
  const userRepository = new UserRepository(db);
  return {
    db,
    userRepository,
    authService: new AuthService(userRepository),
  };
}
