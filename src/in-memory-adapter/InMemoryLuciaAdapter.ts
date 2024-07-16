import type { Adapter, DatabaseSession, DatabaseUser, UserId } from "lucia";
import { isWithinExpirationDate } from "oslo";
import type { InMemoryUserRepository } from "./InMemoryAuthRepository";

export class InMemoryLuciaAdapter implements Adapter {
  #sessions: Record<string, DatabaseSession> = {};
  #userRepository: InMemoryUserRepository;

  constructor(userRepository: InMemoryUserRepository) {
    this.#userRepository = userRepository;
  }

  get sessions(): DatabaseSession[] {
    return Object.values(this.#sessions);
  }

  async getSessionAndUser(
    sessionId: string,
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const session = this.#sessions[sessionId];
    if (!session) return [null, null];

    const user = this.#userRepository.users.find((user) => user.id === session.userId);
    if (!user) return [null, null];

    return [
      session,
      {
        id: user.id,
        attributes: { email: user.email, emailVerifiedAt: user.emailVerifiedAt },
      } ?? null,
    ];
  }

  async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    return this.sessions.filter((session) => session.userId === userId);
  }
  async setSession(session: DatabaseSession): Promise<void> {
    this.#sessions[session.id] = session;
  }
  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    this.#sessions[sessionId].expiresAt = expiresAt;
  }
  async deleteSession(sessionId: string): Promise<void> {
    delete this.#sessions[sessionId];
  }
  async deleteUserSessions(userId: UserId): Promise<void> {
    Object.keys(this.#sessions).forEach((sessionId) => {
      if (this.#sessions[sessionId].userId === userId) {
        delete this.#sessions[sessionId];
      }
    });
  }
  async deleteExpiredSessions(): Promise<void> {
    Object.keys(this.#sessions).forEach((sessionId) => {
      if (isWithinExpirationDate(this.#sessions[sessionId].expiresAt)) {
        delete this.#sessions[sessionId];
      }
    });
  }
}
