import type { Lucia, User } from "lucia";

export type EmailAndPassword = {
  email: string;
  password: string;
};

export type Cookies = () => {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, attributes?: Record<string, any>) => void;
};

export type AuthEmailSenders = {
  sendVerificationCode: (params: {
    email: string;
    code: string;
  }) => Promise<void>;
  sendPasswordResetLink: (params: {
    email: string;
    verificationLink: string;
  }) => Promise<void>;
};

export type EmailVerification = {
  code: string;
  userId: string;
  email: string;
  expiresAt: Date;
};

type WithPasswordHash = { passwordHash: string };

type UserWithPasswordHash = User & WithPasswordHash;
type ResetPasswordToken = {
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
    updatePasswordHash: (params: { userId: string } & WithPasswordHash) => Promise<void>;
  };

  emailVerificationCode: {
    deleteAllForUser: (userId: string) => Promise<void>;
    insert: (emailVerification: EmailVerification) => Promise<void>;
    getByUserId: (userId: string) => Promise<EmailVerification | undefined>;
  };

  resetPasswordToken: {
    insert: (params: ResetPasswordToken) => Promise<void>;
    getByTokenHash: (
      resetPasswordToken: string,
    ) => Promise<ResetPasswordToken | undefined>;
    deleteAllForUser: (userId: string) => Promise<void>;
    deleteAllByTokenHash: (tokenHash: string) => Promise<void>;
  };
};

export type AuthDependencies = {
  resetPasswordBaseUrl: string;
  lucia: Lucia;
  authRepository: AuthRepository;
  emails: AuthEmailSenders;
};
