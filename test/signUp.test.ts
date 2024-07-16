import { beforeEach, describe, expect, it } from "vitest";
import type { AuthUseCases } from "../src";
import type { InMemoryAuthRepository } from "../src/in-memory-adapter/InMemoryAuthRepository";
import {
  type SentEmail,
  createTestUseCases,
  expectToEqual,
  expectToMatch,
} from "./testUtils";

describe("Auth use cases", () => {
  describe("signUp", () => {
    let useCases: AuthUseCases;
    let authRepository: InMemoryAuthRepository;
    let sentEmails: SentEmail[];

    beforeEach(() => {
      ({ useCases, authRepository, sentEmails } = createTestUseCases());
    });

    it("saves the user and the session, and returns the cookie", async () => {
      const emailAndPassword = {
        email: "test@test.com",
        password: "password",
      };

      const cookie = await useCases.signUp(emailAndPassword);

      expectToMatch(cookie, {
        name: "auth_session",
        value: expect.any(String),
      });
      expect(authRepository.user.users).toHaveLength(1);
      const userInRepo = authRepository.user.users[0];
      expectToEqual(userInRepo, {
        id: expect.any(String),
        passwordHash: expect.any(String),
        email: emailAndPassword.email,
        emailVerifiedAt: null,
      });

      expect(authRepository.emailVerificationCode.emailVerifications).toHaveLength(1);
      const emailVerificationInRepo =
        authRepository.emailVerificationCode.emailVerifications[0];
      expectToEqual(emailVerificationInRepo, {
        code: expect.any(String),
        userId: userInRepo.id,
        email: userInRepo.email,
        expiresAt: expect.any(Date),
      });
      expectToEqual(sentEmails, [
        {
          kind: "sendVerificationCode",
          params: {
            email: userInRepo.email,
            code: emailVerificationInRepo.code,
          },
        },
      ]);
    });
  });
});
