import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { beforeEach, describe, it } from "vitest";
import { createKyselyAuthRepository } from "../src/kysely-adapters";
import type { AuthDb, KyselyAuthDb } from "../src/kysely-adapters/AuthDb";
import type {
  AuthRepository,
  EmailVerificationCode,
  ResetPasswordToken,
  UserWithPasswordHash,
} from "../src/types";
import { expectToEqual } from "./testUtils";

const user: UserWithPasswordHash = {
  id: "user-id",
  email: "user@test.com",
  passwordHash: "passwordHash",
  emailVerifiedAt: null,
};

describe("Kysely Auth Repository", () => {
  let pool: Pool;
  let db: KyselyAuthDb;
  let authRepository: AuthRepository;

  beforeEach(async () => {
    pool = new Pool({
      connectionString: "postgres://user:pg_password@localhost:5432/db",
    });
    db = new Kysely<AuthDb>({
      dialect: new PostgresDialect({
        pool,
      }),
    });
    authRepository = createKyselyAuthRepository(db);

    await db.deleteFrom("users").execute();
    await db.deleteFrom("users_reset_password_tokens").execute();
    await db.deleteFrom("users_email_verification_codes").execute();
  });

  describe("user", () => {
    it("inserts a user, finds it by email, marks it as verified, updates its password hash", async () => {
      await authRepository.user.insert(user);

      const foundUser = await authRepository.user.findByEmail(user.email);
      expectToEqual(foundUser, user);

      const now = new Date();
      await authRepository.user.markEmailVerified({
        userId: user.id,
        verifiedAt: now,
      });

      const updatedUserEmailVerifiedAt = await authRepository.user.findByEmail(
        user.email,
      );
      expectToEqual(updatedUserEmailVerifiedAt, { ...user, emailVerifiedAt: now });

      const newPasswordHash = "newPasswordHash";
      await authRepository.user.updatePasswordHash({
        userId: user.id,
        passwordHash: newPasswordHash,
      });
      const updatedUserPasswordHash = await authRepository.user.findByEmail(user.email);
      expectToEqual(updatedUserPasswordHash, {
        ...updatedUserEmailVerifiedAt,
        passwordHash: newPasswordHash,
      });
    });
  });

  describe("emailVerificationCode", () => {
    it("inserts a emailVerificationCode, finds it by userId, deletes all codes for the user", async () => {
      await authRepository.user.insert(user);

      const emailVerificationCode: EmailVerificationCode = {
        code: "code",
        userId: user.id,
        email: user.email,
        expiresAt: new Date(),
      };

      await authRepository.emailVerificationCode.insert(emailVerificationCode);

      const foundEmailVerificationCode =
        await authRepository.emailVerificationCode.getByUserId(user.id);
      expectToEqual(foundEmailVerificationCode, emailVerificationCode);

      await authRepository.emailVerificationCode.deleteAllForUser(user.id);
      const foundEmailVerificationCodeAfterDelete =
        await authRepository.emailVerificationCode.getByUserId(user.id);
      expectToEqual(foundEmailVerificationCodeAfterDelete, undefined);
    });
  });

  describe("resetPasswordToken", () => {
    it("inserts a resetPasswordToken, finds it by tokenHash, deletes all tokens for the user and delete by tokenHash", async () => {
      const user2: UserWithPasswordHash = {
        id: "user-id-2",
        email: "user2@test.com",
        passwordHash: "passwordHash",
        emailVerifiedAt: new Date(),
      };

      await authRepository.user.insert(user);
      await authRepository.user.insert(user2);

      const resetPasswordToken: ResetPasswordToken = {
        userId: user.id,
        tokenHash: "tokenHash",
        expiresAt: new Date(),
      };

      const resetPasswordToken2: ResetPasswordToken = {
        userId: user2.id,
        tokenHash: "tokenHash2",
        expiresAt: new Date(),
      };

      await authRepository.resetPasswordToken.insert(resetPasswordToken);
      await authRepository.resetPasswordToken.insert(resetPasswordToken2);

      const foundResetPasswordToken =
        await authRepository.resetPasswordToken.getByTokenHash(
          resetPasswordToken.tokenHash,
        );
      expectToEqual(foundResetPasswordToken, resetPasswordToken);

      await authRepository.resetPasswordToken.deleteAllForUser(user.id);
      const foundResetPasswordTokenAfterDelete =
        await authRepository.resetPasswordToken.getByTokenHash(
          resetPasswordToken.tokenHash,
        );
      expectToEqual(foundResetPasswordTokenAfterDelete, undefined);

      const foundResetPasswordToken2 =
        await authRepository.resetPasswordToken.getByTokenHash(
          resetPasswordToken2.tokenHash,
        );
      expectToEqual(foundResetPasswordToken2, resetPasswordToken2);

      await authRepository.resetPasswordToken.deleteByTokenHash(
        resetPasswordToken2.tokenHash,
      );
      const foundResetPasswordToken2AfterDelete =
        await authRepository.resetPasswordToken.getByTokenHash(
          resetPasswordToken2.tokenHash,
        );
      expectToEqual(foundResetPasswordToken2AfterDelete, undefined);
    });
  });
});
