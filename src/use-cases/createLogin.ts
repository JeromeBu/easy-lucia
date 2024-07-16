import { Argon2id } from "oslo/password";

import type { EmailAndPassword } from "../types";

import { hashingParams } from "../config/createLucia";
import type { AuthDependencies } from "../types";

export const createLogin =
  ({ lucia, authRepository }: AuthDependencies) =>
  async ({ email, password }: EmailAndPassword) => {
    const user = await authRepository.user.findByEmail(email);

    if (!user) {
      // NOTE:
      // Returning immediately allows malicious actors to figure out valid emails from response times,
      // allowing them to only focus on guessing passwords in brute-force attacks.
      // As a preventive measure, you may want to hash passwords even for invalid emails.
      // However, valid emails can be already be revealed with the signup page
      // and a similar timing issue can likely be found in password reset implementation.
      // It will also be much more resource intensive.
      // Since protecting against this is non-trivial,
      // it is crucial your implementation is protected against brute-force attacks with login throttling etc.
      // If emails/usernames are public, you may outright tell the user that the username is invalid.
      throw new Error("Invalid email or password");
    }

    const validPassword = await new Argon2id(hashingParams).verify(
      user.passwordHash,
      password,
    );

    if (!validPassword) {
      throw new Error("Invalid email or password");
    }

    const session = await lucia.createSession(user.id, {});
    return lucia.createSessionCookie(session.id);
  };
