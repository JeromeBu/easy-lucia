import type { Kysely } from "kysely";
import { type Adapter, Lucia } from "lucia";
import {
  InMemoryAuthRepository,
  InMemoryLuciaAdapter,
  type InMemoryUserRepository,
} from "./in-memory-adapters";
import {
  type AuthDb,
  createKyselyAuthRepository,
  createKyselyLuciaAdapter,
} from "./kysely-adapters";
import type { AuthRepository } from "./types";

export const createLuciaAndAuthRepository = <Db extends AuthDb>(
  params:
    | { kind: "in-memory"; secure: boolean; userRepository: InMemoryUserRepository }
    | { kind: "kysely"; secure: boolean; kyselyDb: Kysely<Db> },
): {
  lucia: Lucia;
  authRepository: AuthRepository;
} => {
  if (params.kind === "in-memory") {
    const authRepository = new InMemoryAuthRepository();
    return {
      lucia: createLucia({
        adapter: new InMemoryLuciaAdapter(authRepository.user),
        secure: params.secure,
      }),
      authRepository,
    };
  }

  if (params.kind === "kysely") {
    return {
      lucia: createLucia({
        adapter: createKyselyLuciaAdapter(params.kyselyDb as any),
        secure: params.secure,
      }),
      authRepository: createKyselyAuthRepository(params.kyselyDb as any),
    };
  }

  throw new Error(`Unknown lucia adapter kind : ${(params as any)?.kind}`);
};

const createLucia = ({ adapter, secure }: { adapter: Adapter; secure: boolean }) =>
  new Lucia(adapter, {
    sessionCookie: {
      attributes: { secure },
    },
    getUserAttributes: (attributes) => ({
      // we don't need to expose the password hash!
      email: attributes.email,
      emailVerifiedAt: attributes.emailVerifiedAt,
    }),
  });

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof createLucia>;
    DatabaseUserAttributes: {
      email: string;
      emailVerifiedAt: Date | null;
    };
  }
}
