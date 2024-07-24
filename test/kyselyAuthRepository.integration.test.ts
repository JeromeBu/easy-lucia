import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { beforeEach, describe, it } from "vitest";
import { createKyselyAuthRepository } from "../src/kysely-adapters";
import type { AuthDb, KyselyAuthDb } from "../src/kysely-adapters/AuthDb";
import type { AuthRepository, UserWithPasswordHash } from "../src/types";
import { expectToEqual } from "./testUtils";

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
  });

  describe("user", () => {
    it("inserts a user, finds it by email, marks it as verified, updates its password hash", async () => {
      const user: UserWithPasswordHash = {
        id: "user-id",
        email: "user@test.com",
        passwordHash: "passwordHash",
        emailVerifiedAt: null,
      };
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
});
