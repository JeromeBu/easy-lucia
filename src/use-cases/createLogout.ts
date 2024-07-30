import type { Lucia } from "lucia";

import type { MakeCookieAccessor } from "../types";
import { createValidateRequest } from "./createValidateRequest";

export const createLogout = (lucia: Lucia) => {
  const validateRequest = createValidateRequest(lucia);
  return async (cookies: MakeCookieAccessor) => {
    const { session } = await validateRequest(cookies);
    if (!session) throw new Error("Unauthorized");

    await lucia.invalidateSession(session.id);
    const blankCookie = lucia.createBlankSessionCookie();
    cookies().set(blankCookie.name, blankCookie.value, blankCookie.attributes);
  };
};
