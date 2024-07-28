import type { Adapter, DatabaseSession, DatabaseUser } from "lucia";
import type { KyselyAuthDb } from "./AuthDb";

export const createKyselyLuciaAdapter = (db: KyselyAuthDb): Adapter => ({
  getSessionAndUser: async (sessionId) => {
    const session: DatabaseSession | null = await db
      .selectFrom("users_sessions")
      .where("id", "=", sessionId)
      .select(["id", "user_id", "expires_at"])
      .executeTakeFirst()
      .then((result) => (result ? kyselySessionToDatabaseSession(result) : null));

    if (!session) return [null, null];

    const user: DatabaseUser | null = await db
      .selectFrom("users")
      .where("id", "=", session.userId)
      .select(["id", "email", "emailVerifiedAt"])
      .executeTakeFirst()
      .then((result) => (result ? kyselyUserToDatabaseUser(result) : null));

    return [session, user];
  },
  getUserSessions: async (userId) =>
    db
      .selectFrom("users_sessions")
      .where("user_id", "=", userId)
      .selectAll()
      .execute()
      .then((results) => results.map(kyselySessionToDatabaseSession)),

  setSession: async (session) => {
    await db
      .insertInto("users_sessions")
      .values({
        id: session.id,
        user_id: session.userId,
        expires_at: session.expiresAt,
      })
      .execute();
  },
  updateSessionExpiration: async (sessionId, expiresAt) => {
    await db
      .updateTable("users_sessions")
      .set({ expires_at: expiresAt })
      .where("id", "=", sessionId)
      .executeTakeFirst();
  },
  deleteSession: async (sessionId) => {
    await db.deleteFrom("users_sessions").where("id", "=", sessionId).executeTakeFirst();
  },
  deleteUserSessions: async (userId) => {
    await db
      .deleteFrom("users_sessions")
      .where("user_id", "=", userId)
      .executeTakeFirst();
  },
  deleteExpiredSessions: async () => {
    await db
      .deleteFrom("users_sessions")
      .where("expires_at", "<", new Date())
      .executeTakeFirst();
  },
});

const kyselySessionToDatabaseSession = (kyselySession: {
  id: string;
  user_id: string;
  expires_at: Date;
}): DatabaseSession => ({
  id: kyselySession.id,
  userId: kyselySession.user_id,
  expiresAt: kyselySession.expires_at,
  attributes: {},
});

const kyselyUserToDatabaseUser = (dbUser: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}): DatabaseUser => ({
  id: dbUser.id,
  attributes: {
    email: dbUser.email,
    emailVerifiedAt: dbUser.emailVerifiedAt,
  },
});
