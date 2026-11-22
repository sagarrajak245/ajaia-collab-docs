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
import { createSupabaseStorage } from "@/server/lib/storage";
import { ShareRepository } from "@/server/repositories/share.repository";
import { UploadRepository } from "@/server/repositories/upload.repository";
import { UploadService } from "@/server/services/upload.service";
import { VersionRepository } from "@/server/repositories/version.repository";
import { VersionService } from "@/server/services/version.service";
import { CommentRepository } from "@/server/repositories/comment.repository";
import { CommentService } from "@/server/services/comment.service";
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
    uploadService: new UploadService(new UploadRepository(db), documentService, createSupabaseStorage()),
    versionService: new VersionService(new VersionRepository(db), documentRepository, documentService),
    commentService: new CommentService(new CommentRepository(db), documentService),
  };
}
