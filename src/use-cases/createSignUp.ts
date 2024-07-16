import { generateIdFromEntropySize } from "lucia";
import { alphabet, generateRandomString } from "oslo/crypto";
import { Argon2id } from "oslo/password";

import { hashingParams } from "../config/createLucia";
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
