/**
 * Composition root: wires repositories and services to the production database.
 *
 * Route handlers get services from here; tests build their own instances with
 * an in-memory database instead. Keeping construction in one place is what
 * makes the layers swappable.
 */
import "server-only";
import { getDb } from "@/server/db/client";
import { DocumentRepository } from "@/server/repositories/document.repository";
import { ShareRepository } from "@/server/repositories/share.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { AuthService } from "@/server/services/auth.service";
import { DocumentService } from "@/server/services/document.service";
import { ShareService } from "@/server/services/share.service";

export function getContainer() {
  const db = getDb();
  const userRepository = new UserRepository(db);
  const documentRepository = new DocumentRepository(db);
  const documentService = new DocumentService(documentRepository);
  return {
    db,
    userRepository,
    documentRepository,
    authService: new AuthService(userRepository),
    documentService,
    shareService: new ShareService(new ShareRepository(db), userRepository, documentService),
  };
}
