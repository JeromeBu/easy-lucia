import { Lucia } from "lucia";
import type { InMemoryUserRepository } from "./InMemoryAuthRepository";
import { InMemoryLuciaAdapter } from "./InMemoryLuciaAdapter";

export const createInMemoryLucia = (userRepository: InMemoryUserRepository) => {
  return new Lucia(new InMemoryLuciaAdapter(userRepository), {
    sessionCookie: {
      attributes: {
        secure: false,
      },
    },
    getUserAttributes: (attributes) => {
      return {
        // we don't need to expose the password hash!
        email: attributes.email,
        emailVerifiedAt: attributes.emailVerifiedAt,
      };
    },
  });
};

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof createInMemoryLucia>;
    DatabaseUserAttributes: {
      email: string;
      emailVerifiedAt: Date | null;
    };
  }
}
