export type { Session, User, Cookie } from "lucia";
import type { AuthDependencies, HashingParams } from "./types";
export type { CookieAccessor } from "./types";

import { createChangePassword } from "./use-cases/createChangePassword";
import { createLogin } from "./use-cases/createLogin";
import { createLogout } from "./use-cases/createLogout";
import { createResetPassword } from "./use-cases/createResetPassword";
import { createSignUp } from "./use-cases/createSignUp";
import { createValidateRequest } from "./use-cases/createValidateRequest";
import { createVerifyEmail } from "./use-cases/createVerifyEmail";

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;

export const createAuthUseCases = (authDependencies: AuthDependencies) => {
  const authDeps = {
    ...authDependencies,
    hashingParams: authDependencies.hashingParams ?? defaultHashingParams,
  };

  return {
    signUp: createSignUp(authDeps),
    login: createLogin(authDeps),
    logout: createLogout(authDeps),
    validateRequest: createValidateRequest(authDeps),
    verifyEmail: createVerifyEmail(authDeps),
    resetPassword: createResetPassword(authDeps),
    changePassword: createChangePassword(authDeps),
  };
};

export type { AuthDependencies } from "./types";

export { createLuciaAndAuthRepository } from "./createLucia";

export const defaultHashingParams: HashingParams = {
  // recommended minimum parameters
  memorySize: 19456,
  iterations: 2,
  tagLength: 32,
  parallelism: 1,
};
