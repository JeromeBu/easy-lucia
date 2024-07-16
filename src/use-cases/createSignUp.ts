import { TimeSpan, generateIdFromEntropySize } from "lucia";
import { createDate } from "oslo";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Argon2id } from "oslo/password";

import { hashingParams } from "../config";
import type { AuthDependencies, EmailAndPassword } from "../types";

export const createSignUp =
  ({ lucia, authRepository, emails }: AuthDependencies) =>
  async ({ email, password }: EmailAndPassword) => {
    const passwordHash = await new Argon2id(hashingParams).hash(password);
    const userId = generateIdFromEntropySize(10); // 16 characters long

    try {
      await authRepository.user.insert({
        id: userId,
        email,
        passwordHash,
        emailVerifiedAt: null,
      });

      const emailValidationCode = generateRandomString(8, alphabet("0-9"));

      await authRepository.emailVerificationCode.insert({
        code: emailValidationCode,
        userId: userId,
        email,
        expiresAt: createDate(new TimeSpan(3, "h")),
      });

      await emails.sendVerificationCode({
        email,
        code: emailValidationCode,
      });

      const session = await lucia.createSession(userId, {});
      return lucia.createSessionCookie(session.id);
    } catch {
      // db error, email taken, etc
      throw new Error("Email already used");
    }
  };
