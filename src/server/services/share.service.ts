/**
 * Sharing business rules. Only the owner may grant, change or revoke access
 * (enforced through DocumentService.authorize so all permission checks share
 * one policy). Any collaborator may list who has access.
 */
import type { ShareRole } from "@/server/constants";
import { NotFoundError, ValidationError } from "@/server/exceptions";
import type { ShareRepository, ShareWithUser } from "@/server/repositories/share.repository";
import type { UserRepository } from "@/server/repositories/user.repository";
import type { CreateShareInput } from "@/server/validators/share.validator";
import type { DocumentShareDto } from "@/types/domain";
import type { DocumentService } from "./document.service";

export class ShareService {
  constructor(
    private readonly shares: ShareRepository,
    private readonly users: UserRepository,
    private readonly documents: DocumentService,
  ) {}

  async list(documentId: string, userId: string): Promise<DocumentShareDto[]> {
    await this.documents.authorize(documentId, userId, "view");
    return (await this.shares.listForDocument(documentId)).map(toDto);
  }

  /** Grants access by email. Re-sharing an existing recipient just updates their role. */
  async share(documentId: string, userId: string, input: CreateShareInput): Promise<DocumentShareDto> {
    const { doc } = await this.documents.authorize(documentId, userId, "share");

    const target = await this.users.findByEmail(input.email);
    if (!target) throw new NotFoundError("User");
    if (target.id === doc.ownerId) throw new ValidationError("The owner already has full access");

    const shareId = await this.shares.upsert(documentId, target.id, input.role);
    return toDto((await this.shares.findInDocument(shareId, documentId))!);
  }

  async updateRole(documentId: string, shareId: string, userId: string, role: ShareRole): Promise<DocumentShareDto> {
    await this.documents.authorize(documentId, userId, "share");
    if (!(await this.shares.updateRole(shareId, documentId, role))) throw new NotFoundError("Share");
    return toDto((await this.shares.findInDocument(shareId, documentId))!);
  }

  async revoke(documentId: string, shareId: string, userId: string): Promise<void> {
    await this.documents.authorize(documentId, userId, "share");
    if (!(await this.shares.delete(shareId, documentId))) throw new NotFoundError("Share");
  }
}

function toDto(s: ShareWithUser): DocumentShareDto {
  return {
    id: s.id,
    user: { id: s.userId, email: s.userEmail, name: s.userName },
    role: s.role,
    createdAt: s.createdAt.toISOString(),
  };
}
