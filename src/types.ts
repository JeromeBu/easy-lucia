import type { Cookie, Lucia, User } from "lucia";
import type { TypedArray } from "oslo";

export type EmailAndPassword = {
  email: string;
  password: string;
};

export type SetCookie = (cookie: Cookie) => void;
export type GetCookie = (name: string) => Cookie | undefined;

export type CookieAccessor = {
  get: GetCookie;
  set: SetCookie;
};

export type AuthEmailSenders = {
  sendSignedUpSuccessfully: (params: {
    email: string;
    code: string;
  }) => Promise<void>;
  sendVerificationCodeAgain: (params: {
    email: string;
    code: string;
  }) => Promise<void>;
  sendPasswordResetLink: (params: {
    email: string;
    verificationLink: string;
  }) => Promise<void>;
};

export type EmailVerificationCode = {
  code: string;
  userId: string;
  email: string;
  expiresAt: Date;
};

type WithPasswordHash = { passwordHash: string };

export type UserWithPasswordHash = User & WithPasswordHash;

export type ResetPasswordToken = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type AuthRepository = {
  user: {
    insert: (params: UserWithPasswordHash) => Promise<void>;
    findByEmail: (email: string) => Promise<UserWithPasswordHash | undefined>;
    markEmailVerified: (params: {
      userId: string;
      verifiedAt: Date;
    }) => Promise<void>;
    updatePasswordHash: (
      params: {
        userId: string;
      } & WithPasswordHash,
    ) => Promise<void>;
  };

  emailVerificationCode: {
    deleteAllForUser: (userId: string) => Promise<void>;
    insert: (emailVerification: EmailVerificationCode) => Promise<void>;
    getByUserId: (userId: string) => Promise<EmailVerificationCode | undefined>;
  };

  resetPasswordToken: {
    insert: (params: ResetPasswordToken) => Promise<void>;
    getByTokenHash: (
      resetPasswordToken: string,
    ) => Promise<ResetPasswordToken | undefined>;
    deleteAllForUser: (userId: string) => Promise<void>;
    deleteByTokenHash: (tokenHash: string) => Promise<void>;
  };
};

export type HashingParams = {
  memorySize?: number;
  iterations?: number;
  tagLength?: number;
  parallelism?: number;
  secret?: ArrayBuffer | TypedArray;
};

export type AuthDependencies = {
  cookieAccessor: CookieAccessor;
  resetPasswordBaseUrl: string;
  lucia: Lucia;
  authRepository: AuthRepository;
  emails: AuthEmailSenders;
  hashingParams?: HashingParams;
};
