import { beforeEach, describe, expect, it } from "vitest";
import type { AuthUseCases } from "../src";
import type { InMemoryAuthRepository } from "../src/in-memory-adapter/InMemoryAuthRepository";
import type { HashingParams, UserWithPasswordHash } from "../src/types";
import {
  type SentEmail,
  createTestUseCases,
  expectPromiseToFailWith,
  expectToEqual,
  expectToMatch,
} from "./testUtils";

const testHashingParams: HashingParams = {
  memorySize: 100,
  iterations: 1,
  tagLength: 32,
  parallelism: 1,
};

const emailAndPassword = {
  email: "test@test.com",
  password: "myPassw0rd+12",
};

describe("Auth use cases", () => {
  let useCases: AuthUseCases;
  let authRepository: InMemoryAuthRepository;
  let sentEmails: SentEmail[];
  let user: UserWithPasswordHash;

  beforeEach(async () => {
    ({ useCases, authRepository, sentEmails } = createTestUseCases(testHashingParams));
    await useCases.signUp(emailAndPassword);
    user = authRepository.user.users[0];
  });

  describe("signUp", () => {
    it("saves the user and the session, and returns the cookie", async () => {
      const nowEmailAndPassword = {
        email: "another@test.com",
        password: "myPassw0rd+12",
      };
      const cookie = await useCases.signUp(nowEmailAndPassword);

      expectToMatch(cookie, {
        name: "auth_session",
        value: expect.any(String),
      });
      expect(authRepository.user.users).toHaveLength(2);
      // biome-ignore lint/style/noNonNullAssertion: we test it's not null
      const newUser = authRepository.user.users.at(-1)!;
      expectToEqual(newUser, {
        id: expect.any(String),
        passwordHash: expect.any(String),
        email: nowEmailAndPassword.email,
        emailVerifiedAt: null,
      });

      expect(user.passwordHash).not.toEqual(newUser.passwordHash);

      expect(authRepository.emailVerificationCode.emailVerifications).toHaveLength(2);
      const emailVerificationInRepo =
        // biome-ignore lint/style/noNonNullAssertion: we test it's not null
        authRepository.emailVerificationCode.emailVerifications.at(-1)!;
      expectToEqual(emailVerificationInRepo, {
        code: expect.any(String),
        userId: newUser.id,
        email: newUser.email,
        expiresAt: expect.any(Date),
      });
      expectToEqual(sentEmails, [
        {
          kind: "sendVerificationCode",
          params: {
            email: user.email,
            code: expect.any(String),
          },
        },
        {
          kind: "sendVerificationCode",
          params: {
            email: newUser.email,
            code: emailVerificationInRepo.code,
          },
        },
      ]);
    });
  });

  describe("logIn", () => {
    it("fails if password do not match", async () => {
      authRepository.user.users = [user];
      expectPromiseToFailWith(
        useCases.login({ email: emailAndPassword.email, password: "wrongPassword" }),
        "Invalid email or password",
      );
    });

    it("creates a session and returns the cookie", async () => {
      authRepository.user.users = [user];
      const cookie = await useCases.login(emailAndPassword);
      expectToMatch(cookie, {
        name: "auth_session",
        value: expect.any(String),
      });
    });
  });
});
