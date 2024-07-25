import { isWithinExpirationDate } from "oslo";
import { sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";
import { Argon2id } from "oslo/password";

import type { AuthDependencies } from "../types";

export const createChangePassword =
  ({ authRepository, lucia, hashingParams }: AuthDependencies) =>
  async ({
    newPassword,
    resetPasswordToken,
  }: {
    email: string;
    newPassword: string;
    resetPasswordToken: string;
  }) => {
    const tokenHash = encodeHex(
      await sha256(new TextEncoder().encode(resetPasswordToken)),
    );
    const token = await authRepository.resetPasswordToken.getByTokenHash(tokenHash);

    if (token) {
      await authRepository.resetPasswordToken.deleteByTokenHash(tokenHash);
    }

    if (!token || !isWithinExpirationDate(token.expiresAt)) {
      throw new Error("Invalid token");
    }

    await lucia.invalidateUserSessions(token.userId);

    const passwordHash = await new Argon2id(hashingParams).hash(newPassword);

    await authRepository.user.updatePasswordHash({
      userId: token.userId,
      passwordHash,
    });

    const session = await lucia.createSession(token.userId, {});
    return lucia.createSessionCookie(session.id);
  };
