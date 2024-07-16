import { isWithinExpirationDate } from "oslo";
import { sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";
import { Argon2id } from "oslo/password";

import { hashingParams } from "../config/createLucia";
import type { AuthDependencies } from "../types";

export const createChangePassword =
  ({ authRepository, lucia }: AuthDependencies) =>
  async ({
    password,
    resetPasswordToken,
  }: {
    email: string;
    password: string;
    resetPasswordToken: string;
  }) => {
    const tokenHash = encodeHex(
      await sha256(new TextEncoder().encode(resetPasswordToken)),
    );
    const token = await authRepository.resetPasswordToken.getByTokenHash(tokenHash);

    if (token) {
      await authRepository.resetPasswordToken.deleteAllByTokenHash(tokenHash);
    }

    if (!token || !isWithinExpirationDate(token.expiresAt)) {
      throw new Error("Invalid token");
    }

    await lucia.invalidateUserSessions(token.userId);

    const passwordHash = await new Argon2id(hashingParams).hash(password);

    await authRepository.user.updatePasswordHash({
      userId: token.userId,
      passwordHash,
    });

    const session = await lucia.createSession(token.userId, {});
    return lucia.createSessionCookie(session.id);
  };
