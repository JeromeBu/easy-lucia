import { TimeSpan, generateIdFromEntropySize } from "lucia";
import { createDate } from "oslo";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Argon2id } from "oslo/password";

import type { AuthDependencies, EmailAndPassword } from "../types";
import { sanitizeEmail, sanitizePassword } from "../utils";

export const createSignUp =
  ({ lucia, authRepository, emails, hashingParams, cookieAccessor }: AuthDependencies) =>
  async (params: EmailAndPassword) => {
    const email = sanitizeEmail(params.email);
    const password = sanitizePassword(params.password);
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

      await emails.sendSignedUpSuccessfully({
        email,
        code: emailValidationCode,
      });

      const session = await lucia.createSession(userId, {});
      const cookie = lucia.createSessionCookie(session.id);
      cookieAccessor.set(cookie);
    } catch {
      // db error, email taken, etc
      throw new Error("Email already used");
    }
  };
