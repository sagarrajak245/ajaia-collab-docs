/**
 * Authentication business logic: verify credentials and issue a session token.
 */
import { InvalidCredentialsError } from "@/server/exceptions";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { createSessionToken } from "@/server/lib/session";
import type { UserRepository } from "@/server/repositories/user.repository";
import type { LoginInput } from "@/server/validators/auth.validator";
import type { UserSummary } from "@/types/domain";

/** Real bcrypt hash (computed once) used to equalize timing when the email does not exist. */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("timing-equalizer"));

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  /**
   * Returns the user and a signed session token.
   * Throws InvalidCredentialsError with the same message for an unknown email
   * and a wrong password, and runs bcrypt in both cases so response timing
   * does not reveal which accounts exist.
   */
  async login(input: LoginInput): Promise<{ user: UserSummary; token: string }> {
    const user = await this.users.findByEmail(input.email);
    const ok = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !ok) throw new InvalidCredentialsError();

    const summary: UserSummary = { id: user.id, email: user.email, name: user.name };
    const token = await createSessionToken({ userId: user.id, email: user.email, name: user.name });
    return { user: summary, token };
  }
}
