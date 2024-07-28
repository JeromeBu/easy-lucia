import type { AuthRepository } from "../types";
import type { KyselyAuthDb } from "./AuthDb";

export const createKyselyAuthRepository = (db: KyselyAuthDb): AuthRepository => ({
  emailVerificationCode: {
    deleteAllForUser: async (userId) => {
      await db
        .deleteFrom("users_email_verification_codes")
        .where("userId", "=", userId)
        .executeTakeFirst();
    },
    insert: async (params) => {
      await db.insertInto("users_email_verification_codes").values(params).execute();
    },
    getByUserId: async (userId) =>
      db
        .selectFrom("users_email_verification_codes")
        .select(["code", "userId", "email", "expiresAt"])
        .where("userId", "=", userId)
        .executeTakeFirst(),
  },
  user: {
    insert: async (params) => {
      await db.insertInto("users").values(params).execute();
    },
    findByEmail: async (email) =>
      db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst(),
    markEmailVerified: async (params) => {
      await db
        .updateTable("users")
        .set({ emailVerifiedAt: params.verifiedAt })
        .where("id", "=", params.userId)
        .executeTakeFirst();
    },
    updatePasswordHash: async ({ userId, passwordHash }) => {
      await db
        .updateTable("users")
        .set({ passwordHash })
        .where("id", "=", userId)
        .executeTakeFirst();
    },
  },
  resetPasswordToken: {
    insert: async (params) => {
      await db.insertInto("users_reset_password_tokens").values(params).execute();
    },
    deleteAllForUser: async (userId) => {
      await db
        .deleteFrom("users_reset_password_tokens")
        .where("userId", "=", userId)
        .executeTakeFirst();
    },
    deleteByTokenHash: async (tokenHash) => {
      await db
        .deleteFrom("users_reset_password_tokens")
        .where("tokenHash", "=", tokenHash)
        .executeTakeFirst();
    },
    getByTokenHash: async (tokenHash) =>
      db
        .selectFrom("users_reset_password_tokens")
        .select(["userId", "tokenHash", "expiresAt"])
        .where("tokenHash", "=", tokenHash)
        .executeTakeFirst(),
  },
});
