import type { AuthDependencies } from "./types";
import { createChangePassword } from "./use-cases/createChangePassword";
import { createLogin } from "./use-cases/createLogin";
import { createLogout } from "./use-cases/createLogout";
import { createResetPassword } from "./use-cases/createResetPassword";
import { createSignUp } from "./use-cases/createSignUp";
import { createValidateRequest } from "./use-cases/createValidateRequest";
import { createVerifyEmail } from "./use-cases/createVerifyEmail";

export const createAuthUseCases = (authDeps: AuthDependencies) => ({
  signUp: createSignUp(authDeps),
  login: createLogin(authDeps),
  logout: createLogout(authDeps.lucia),
  validateRequest: createValidateRequest(authDeps.lucia),
  verifyEmail: createVerifyEmail(authDeps),
  resetPassword: createResetPassword(authDeps),
  changePassword: createChangePassword(authDeps),
});

export type { AuthDependencies } from "./types";
