import type { AuthDependencies } from "../types";
import { createValidateRequest } from "./createValidateRequest";

export const createLogout = (deps: AuthDependencies) => {
  const validateRequest = createValidateRequest(deps);
  const { cookieAccessor, lucia } = deps;
  return async () => {
    const { session } = await validateRequest();
    if (!session) throw new Error("Unauthorized");

    await lucia.invalidateSession(session.id);
    const blankCookie = lucia.createBlankSessionCookie();
    cookieAccessor.set(blankCookie);
  };
};
