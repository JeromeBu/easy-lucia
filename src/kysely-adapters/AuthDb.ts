import type { Generated, Kysely } from "kysely";

export type KyselyAuthDb = Kysely<AuthDb>;

export interface AuthDb {
  users: UsersTable;
  users_sessions: SessionsTable;
  users_email_verification_codes: EmailVerificationCodesTable;
  users_reset_password_tokens: ResetPasswordTokensTable;
}

interface UsersTable {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
}

interface SessionsTable {
  id: string;
  user_id: string;
  expires_at: Date;
}

interface EmailVerificationCodesTable {
  id: Generated<number>;
  code: string;
  userId: string;
  email: string;
  expiresAt: Date;
}

interface ResetPasswordTokensTable {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}
