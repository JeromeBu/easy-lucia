import type { DatabaseSession } from "lucia";
import { beforeEach, describe, expect, it } from "vitest";
import type { AuthUseCases } from "../src";
import type { InMemoryAuthRepository } from "../src/in-memory-adapters/InMemoryAuthRepository";
import type { InMemoryLuciaAdapter } from "../src/in-memory-adapters/InMemoryLuciaAdapter";
import type { createInMemoryCookieAccessor } from "../src/in-memory-adapters/createInMemoryCookieAccessor";
import type {
  EmailVerification,
  HashingParams,
  ResetPasswordToken,
  UserWithPasswordHash,
} from "../src/types";
import {
  type SentEmail,
  createTestUseCases,
  expectObjectToMatchInArray,
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

const resetPasswordBaseUrl = "https://my-domain.com/reset-password";

const emailAndPassword = {
  email: "TEST@tEst.com ",
  password: " myPassw0rd+12",
};

describe("Auth use cases", () => {
  let useCases: AuthUseCases;
  let authRepository: InMemoryAuthRepository;
  let sentEmails: SentEmail[];
  let user: UserWithPasswordHash;
  let inMemoryLuciaAdapter: InMemoryLuciaAdapter;
  let inMemoryCookieAccessor: ReturnType<typeof createInMemoryCookieAccessor>;

  beforeEach(async () => {
    ({
      useCases,
      authRepository,
      sentEmails,
      inMemoryCookieAccessor,
      inMemoryLuciaAdapter,
    } = createTestUseCases({ hashingParams: testHashingParams, resetPasswordBaseUrl }));
    await useCases.signUp(emailAndPassword);
    user = authRepository.user.users[0];
    await inMemoryLuciaAdapter.deleteUserSessions(user.id);
  });

  describe("signUp and verify email", () => {
    it("saves the user and the session, and returns the cookie", async () => {
      expectToEqual(inMemoryLuciaAdapter.sessions, []);
      const nowEmailAndPassword = {
        email: " anothER@test.com",
        password: "myPassw0rd+12 ",
      };
      const cookie = await useCases.signUp(nowEmailAndPassword);

      expectToMatch(cookie, {
        name: "auth_session",
        value: expect.any(String),
      });

      expectSessionsToMatch([
        {
          userId: expect.any(String),
          expiresAt: expect.any(Date),
          id: expect.any(String),
        },
      ]);

      expectUsersToMatch([
        { email: user.email },
        {
          id: expect.any(String),
          passwordHash: expect.any(String),
          email: nowEmailAndPassword.email.trim().toLowerCase(),
          emailVerifiedAt: null,
        },
      ]);
      // biome-ignore lint/style/noNonNullAssertion: we test it's not null
      const newUser = authRepository.user.users.at(-1)!;

      // even if the password is the same, the hash is different
      expect(user.passwordHash).not.toEqual(newUser.passwordHash);

      expectVerificationEmailsToMatch([
        { userId: user.id },
        {
          code: expect.any(String),
          userId: newUser.id,
          email: newUser.email,
          expiresAt: expect.any(Date),
        },
      ]);
      const emailVerificationInRepo =
        // biome-ignore lint/style/noNonNullAssertion: we test it's not null
        authRepository.emailVerificationCode.emailVerifications.at(-1)!;

      expectSentEmailsToMatch([
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

      const validateEmailCookie = await useCases.verifyEmail({
        candidateCode: emailVerificationInRepo.code,
        sessionId: cookie.value,
      });
      expectToMatch(validateEmailCookie, {
        name: "auth_session",
        value: expect.any(String),
      });
      expectUsersToMatch([user, { ...newUser, emailVerifiedAt: expect.any(Date) }]);
    });
  });

  describe("login, verifyRequest and logout", () => {
    it("fails if no user are found with email", async () => {
      expectPromiseToFailWith(
        useCases.login({ email: "not@found.com", password: "whatever" }),
        "Invalid email or password",
      );
    });

    it("fails if password do not match", async () => {
      authRepository.user.users = [user];
      expectPromiseToFailWith(
        useCases.login({ email: emailAndPassword.email, password: "wrongPassword" }),
        "Invalid email or password",
      );
    });

    it("login creates a session and the cookie, than validates a request, than logout", async () => {
      authRepository.user.users = [user];
      const cookie = await useCases.login(emailAndPassword);
      expectToMatch(cookie, {
        name: "auth_session",
        value: expect.any(String),
      });
      expectSessionsToMatch([{ userId: user.id }]);

      inMemoryCookieAccessor().set(cookie.name, cookie.value);

      const result = await useCases.validateRequest(inMemoryCookieAccessor);
      expectToMatch(result, {
        user: {
          id: user.id,
          email: user.email,
          emailVerifiedAt: null,
        },
        session: {
          id: expect.any(String),
          userId: user.id,
          expiresAt: expect.any(Date),
          fresh: false,
        },
      });

      const cookieAfterLogout = await useCases.logout(inMemoryCookieAccessor);
      expectToMatch(cookieAfterLogout, {
        name: "auth_session",
        value: "",
      });
      expectSessionsToMatch([]);
    });
  });

  describe("reset password and change it", () => {
    it("triggers reset password", async () => {
      const initialPasswordHash = "initialPasswordHash";
      const userWithVerifiedEmail: UserWithPasswordHash = {
        id: "user-reseting-password-id",
        email: "email@reset.pwd",
        emailVerifiedAt: new Date(),
        passwordHash: initialPasswordHash,
      };
      authRepository.user.users = [userWithVerifiedEmail];
      await useCases.resetPassword({ email: userWithVerifiedEmail.email });
      expectSentEmailsToMatch([
        { kind: "sendVerificationCode" },
        {
          kind: "sendPasswordResetLink",
          params: {
            email: userWithVerifiedEmail.email,
            verificationLink: expect.any(String),
          },
        },
      ]);
      expectResetPasswordTokensToMatch([
        {
          userId: userWithVerifiedEmail.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      ]);

      // biome-ignore lint/style/noNonNullAssertion: We tested it's not null
      const resetPasswordEmail = sentEmails.at(-1)! as Extract<
        SentEmail,
        { kind: "sendPasswordResetLink" }
      >;

      expect(resetPasswordEmail.params.verificationLink).toContain(resetPasswordBaseUrl);
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const token = resetPasswordEmail.params.verificationLink.split("/").pop()!;

      const cookie = await useCases.changePassword({
        email: userWithVerifiedEmail.email,
        newPassword: "myNewPassword",
        resetPasswordToken: token,
      });
      expectToMatch(cookie, {
        name: "auth_session",
        value: expect.any(String),
      });
      expectSessionsToMatch([
        {
          userId: userWithVerifiedEmail.id,
          expiresAt: expect.any(Date),
          id: expect.any(String),
        },
      ]);
      expect(initialPasswordHash).not.toBe(userWithVerifiedEmail.passwordHash);
      expectResetPasswordTokensToMatch([]);
    });
  });

  const expectSessionsToMatch = (expectedSessions: Partial<DatabaseSession>[]) => {
    expectObjectToMatchInArray(inMemoryLuciaAdapter.sessions, expectedSessions);
  };

  const expectUsersToMatch = (expectedUsers: Partial<UserWithPasswordHash>[]) => {
    expectObjectToMatchInArray(authRepository.user.users, expectedUsers);
  };

  const expectVerificationEmailsToMatch = (
    expectedVerificationEmails: Partial<EmailVerification>[],
  ) => {
    expectObjectToMatchInArray(
      authRepository.emailVerificationCode.emailVerifications,
      expectedVerificationEmails,
    );
  };

  const expectSentEmailsToMatch = (expectedSentEmails: Partial<SentEmail>[]) => {
    expectObjectToMatchInArray(sentEmails, expectedSentEmails);
  };

  const expectResetPasswordTokensToMatch = (
    expectedResetPasswordTokens: Partial<ResetPasswordToken>[],
  ) => {
    expectObjectToMatchInArray(
      authRepository.resetPasswordToken.resetPasswordTokens,
      expectedResetPasswordTokens,
    );
  };
});
