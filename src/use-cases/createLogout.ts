import type { Lucia } from "lucia";

import type { Cookies } from "../types";
import { createValidateRequest } from "./createValidateRequest";

export const createLogout = (lucia: Lucia) => {
  const validateRequest = createValidateRequest(lucia);
  return async (cookies: Cookies) => {
    const { session } = await validateRequest(cookies);
    if (!session) throw new Error("Unauthorized");

    await lucia.invalidateSession(session.id);
    return lucia.createBlankSessionCookie();
  };
};
