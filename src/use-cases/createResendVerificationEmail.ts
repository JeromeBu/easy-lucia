import { TimeSpan } from "lucia";
import { createDate } from "oslo";
import { alphabet, generateRandomString } from "oslo/crypto";

import type { AuthDependencies } from "../types";
import { createValidateRequest } from "./createValidateRequest";

export const createResendVerificationEmail = (deps: AuthDependencies) => {
  const validateRequest = createValidateRequest(deps);
  const { emails, authRepository } = deps;
  return async () => {
    const { user, session } = await validateRequest();
    if (!session || !user) throw new Error("Unauthorized");

    await authRepository.emailVerificationCode.deleteAllForUser(user.id);

    const emailValidationCode = generateRandomString(8, alphabet("0-9"));

    await authRepository.emailVerificationCode.insert({
      code: emailValidationCode,
      userId: user.id,
      email: user.email,
      expiresAt: createDate(new TimeSpan(3, "h")),
    });

    await emails.sendVerificationCodeAgain({
      email: user.email,
      code: emailValidationCode,
    });
  };
};
