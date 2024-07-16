import type { User } from "lucia";
import { isWithinExpirationDate } from "oslo";

import type { AuthDependencies, EmailVerification } from "../types";

export const createVerifyEmail = ({ lucia, authRepository }: AuthDependencies) => {
  return async ({
    sessionId,
    candidateCode,
  }: {
    sessionId: string;
    candidateCode: string;
  }) => {
    const { user } = await lucia.validateSession(sessionId);
    if (!user) throw new Error("Unauthorized");

    const emailVerification = await authRepository.emailVerificationCode.getByUserId(
      user.id,
    );
    if (
      !isCodeValid({
        dbEmailVerification: emailVerification,
        user,
        candidateCode,
      })
    )
      throw new Error("Bad request");

    await lucia.invalidateUserSessions(user.id);
    await authRepository.user.markEmailVerified({
      verifiedAt: new Date(),
      userId: user.id,
    });

    const session = await lucia.createSession(user.id, {});
    return lucia.createSessionCookie(session.id);
  };
};

const isCodeValid = ({
  dbEmailVerification,
  candidateCode,
  user,
}: {
  dbEmailVerification: EmailVerification | undefined;
  candidateCode: string;
  user: User;
}): boolean => {
  if (!dbEmailVerification || candidateCode !== dbEmailVerification.code) return false;

  if (!isWithinExpirationDate(dbEmailVerification.expiresAt)) return false;

  if (dbEmailVerification.email !== user.email) return false;

  return true;
};
