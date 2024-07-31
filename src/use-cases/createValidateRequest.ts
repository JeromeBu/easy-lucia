import type { Session, User } from "lucia";

import type { AuthDependencies } from "../types";

export const createValidateRequest =
  ({ lucia, cookieAccessor }: AuthDependencies) =>
  async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
    const sessionId = cookieAccessor.get(lucia.sessionCookieName)?.value ?? null;
    if (!sessionId) {
      return { user: null, session: null };
    }
    const result = await lucia.validateSession(sessionId);

    try {
      if (result.session?.fresh) {
        const sessionCookie = lucia.createSessionCookie(result.session.id);
        cookieAccessor.set(sessionCookie);
      }

      if (!result.session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        cookieAccessor.set(sessionCookie);
      }
    } catch (e: any) {
      console.error(`Failed to set session cookie : ${e?.message}`);
    }

    return result;
  };
