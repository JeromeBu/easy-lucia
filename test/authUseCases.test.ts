import type { DatabaseSession } from "lucia";
import { beforeEach, describe, expect, it } from "vitest";
import type { AuthUseCases } from "../src";
import type {
  InMemoryAuthRepository,
  InMemoryLuciaAdapter,
} from "../src/in-memory-adapters";
import type { InMemoryCookieAccessor } from "../src/in-memory-adapters";
import type {
  EmailVerificationCode,
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
  let inMemoryCookieAccessor: InMemoryCookieAccessor;

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

  describe("signUp, ask for verification email again, verify email", () => {
    it("saves the user and the session, and sets the cookie, than send other code, than verify email", async () => {
      expectToEqual(inMemoryLuciaAdapter.sessions, []);
      const nowEmailAndPassword = {
        email: " anothER@test.com",
        password: "myPassw0rd+12 ",
      };
      await useCases.signUp(nowEmailAndPassword);

      expectToMatch(inMemoryCookieAccessor.cookies, [
        {
          name: "auth_session",
          value: expect.any(String),
        },
      ]);
      const cookie = inMemoryCookieAccessor.cookies[0];

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

      expectVerificationEmailCodesToMatch([
        { userId: user.id },
        {
          code: expect.any(String),
          userId: newUser.id,
          email: newUser.email,
          expiresAt: expect.any(Date),
        },
      ]);
      const signUpEmailVerificationCode =
        // biome-ignore lint/style/noNonNullAssertion: we test it's not null
        authRepository.emailVerificationCode.emailVerificationCodes.at(-1)!;

      expectSentEmailsToMatch([
        {
          kind: "signedUpSuccessfully",
          params: {
            email: user.email,
            code: expect.any(String),
          },
        },
        {
          kind: "signedUpSuccessfully",
          params: {
            email: newUser.email,
            code: signUpEmailVerificationCode.code,
          },
        },
      ]);

      await useCases.resendVerificationEmail();

      await expectPromiseToFailWith(
        useCases.verifyEmail({
          candidateCode: signUpEmailVerificationCode.code,
          sessionId: cookie.value,
        }),
        "Bad request",
      );

      expectVerificationEmailCodesToMatch([
        { userId: user.id },
        {
          code: expect.any(String),
          userId: newUser.id,
          email: newUser.email,
          expiresAt: expect.any(Date),
        },
      ]);
      const emailVerificationCodeAgain =
        // biome-ignore lint/style/noNonNullAssertion: we test it's not null
        authRepository.emailVerificationCode.emailVerificationCodes.at(-1)!;

      expect(emailVerificationCodeAgain.code).not.toEqual(
        signUpEmailVerificationCode.code,
      );

      expectSentEmailsToMatch([
        {
          kind: "signedUpSuccessfully",
          params: {
            email: user.email,
            code: expect.any(String),
          },
        },
        {
          kind: "signedUpSuccessfully",
          params: {
            email: newUser.email,
            code: signUpEmailVerificationCode.code,
          },
        },
        {
          kind: "verificationCodeAgain",
          params: {
            email: newUser.email,
            code: emailVerificationCodeAgain.code,
          },
        },
      ]);

      await useCases.verifyEmail({
        candidateCode: emailVerificationCodeAgain.code,
        sessionId: cookie.value,
      });

      expectToMatch(inMemoryCookieAccessor.cookies, [
        {
          name: "auth_session",
          value: expect.any(String),
        },
      ]);
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
      await useCases.login(emailAndPassword);
      expectToMatch(inMemoryCookieAccessor.cookies, [
        {
          name: "auth_session",
          value: expect.any(String),
        },
      ]);
      expectSessionsToMatch([{ userId: user.id }]);

      const result = await useCases.validateRequest();
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

      await useCases.logout();

      expectToMatch(inMemoryCookieAccessor.cookies, [
        {
          name: "auth_session",
          value: "",
        },
      ]);
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
        { kind: "signedUpSuccessfully" },
        {
          kind: "passwordResetLink",
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
        { kind: "passwordResetLink" }
      >;

      expect(resetPasswordEmail.params.verificationLink).toContain(resetPasswordBaseUrl);
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const token = resetPasswordEmail.params.verificationLink.split("/").pop()!;

      await useCases.changePassword({
        email: userWithVerifiedEmail.email,
        newPassword: "myNewPassword",
        resetPasswordToken: token,
      });
      expectToMatch(inMemoryCookieAccessor.cookies, [
        {
          name: "auth_session",
          value: expect.any(String),
        },
      ]);
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

  const expectVerificationEmailCodesToMatch = (
    expectedVerificationEmailCodes: Partial<EmailVerificationCode>[],
  ) => {
    expectObjectToMatchInArray(
      authRepository.emailVerificationCode.emailVerificationCodes,
      expectedVerificationEmailCodes,
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
