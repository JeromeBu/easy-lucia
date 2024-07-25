import { TimeSpan, generateIdFromEntropySize } from "lucia";
import { createDate } from "oslo";
import { sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";

import type { AuthDependencies } from "../types";

export const createResetPassword =
  ({ authRepository, emails, resetPasswordBaseUrl }: AuthDependencies) =>
  async ({ email }: { email: string }) => {
    const user = await authRepository.user.findByEmail(email);
    if (!user || !user.emailVerifiedAt) throw new Error("Invalid email");
    await authRepository.resetPasswordToken.deleteAllForUser(user.id);
    const token = generateIdFromEntropySize(25); // 40 character
    const tokenHash = encodeHex(await sha256(new TextEncoder().encode(token)));
    await authRepository.resetPasswordToken.insert({
      userId: user.id,
      tokenHash,
      expiresAt: createDate(new TimeSpan(2, "h")),
    });
    await emails.sendPasswordResetLink({
      email: user.email,
      verificationLink: `${resetPasswordBaseUrl}/${token}`,
    });
  };
