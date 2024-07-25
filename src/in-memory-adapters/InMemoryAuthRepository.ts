import type {
  AuthRepository,
  EmailVerification,
  ResetPasswordToken,
  UserWithPasswordHash,
} from "../types";

type UserRepository = AuthRepository["user"];
export class InMemoryUserRepository implements UserRepository {
  #users: Record<string, UserWithPasswordHash> = {};
  async insert(params: UserWithPasswordHash): Promise<void> {
    this.#users[params.id] = params;
  }
  async findByEmail(email: string): Promise<UserWithPasswordHash | undefined> {
    return this.users.find((user) => user.email === email);
  }
  async markEmailVerified(params: { userId: string; verifiedAt: Date }): Promise<void> {
    this.#users[params.userId].emailVerifiedAt = params.verifiedAt;
  }
  async updatePasswordHash(
    params: { userId: string } & { passwordHash: string },
  ): Promise<void> {
    this.#users[params.userId].passwordHash = params.passwordHash;
  }

  get users(): UserWithPasswordHash[] {
    return Object.values(this.#users);
  }

  set users(users: UserWithPasswordHash[]) {
    this.#users = users.reduce(
      (acc, user) => {
        acc[user.id] = user;
        return acc;
      },
      {} as Record<string, UserWithPasswordHash>,
    );
  }
}

type EmailVerificationRepository = AuthRepository["emailVerificationCode"];
class InMemoryEmailVerificationRepository implements EmailVerificationRepository {
  #emailVerifications: Record<string, EmailVerification> = {};

  async deleteAllForUser(userId: string): Promise<void> {
    delete this.#emailVerifications[userId];
  }

  async insert(emailVerification: EmailVerification): Promise<void> {
    this.#emailVerifications[emailVerification.userId] = emailVerification;
  }

  async getByUserId(userId: string): Promise<EmailVerification | undefined> {
    return this.#emailVerifications[userId];
  }

  get emailVerifications() {
    return Object.values(this.#emailVerifications);
  }
}

type ResetPasswordTokenRepository = AuthRepository["resetPasswordToken"];
class InMemoryResetPasswordTokenRepository implements ResetPasswordTokenRepository {
  #resetPasswordTokens: Record<string, ResetPasswordToken> = {};

  async deleteAllForUser(userId: string): Promise<void> {
    delete this.#resetPasswordTokens[userId];
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    Object.keys(this.#resetPasswordTokens).forEach((token) => {
      if (this.#resetPasswordTokens[token].tokenHash === tokenHash) {
        delete this.#resetPasswordTokens[token];
      }
    });
  }

  async insert(params: ResetPasswordToken): Promise<void> {
    this.#resetPasswordTokens[params.userId] = params;
  }

  async getByTokenHash(tokenHash: string): Promise<ResetPasswordToken | undefined> {
    return Object.values(this.#resetPasswordTokens).find(
      (token) => token.tokenHash === tokenHash,
    );
  }

  get resetPasswordTokens() {
    return Object.values(this.#resetPasswordTokens);
  }
}

export class InMemoryAuthRepository implements AuthRepository {
  user = new InMemoryUserRepository();
  emailVerificationCode = new InMemoryEmailVerificationRepository();
  resetPasswordToken = new InMemoryResetPasswordTokenRepository();
}
