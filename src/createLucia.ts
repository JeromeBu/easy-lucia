import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";
import { type Adapter, Lucia } from "lucia";
import type { Pool } from "pg";
import {
  InMemoryAuthRepository,
  InMemoryLuciaAdapter,
  type InMemoryUserRepository,
} from "./in-memory-adapters";
import { type KyselyAuthDb, createKyselyAuthRepository } from "./kysely-adapters";
import type { AuthDb } from "./kysely-adapters/AuthDb";
import type { AuthRepository } from "./types";

export const createLuciaAndAuthRepository = (
  params:
    | { kind: "in-memory"; secure: boolean; userRepository: InMemoryUserRepository }
    | { kind: "kysely"; secure: boolean; db: KyselyAuthDb; pool: Pool },
): {
  lucia: Lucia;
  authRepository: AuthRepository;
} => {
  if (params.kind === "in-memory") {
    const authRepository = new InMemoryAuthRepository();
    const adapter = new InMemoryLuciaAdapter(authRepository.user);
    return {
      lucia: createLucia({ adapter, secure: params.secure }),
      authRepository,
    };
  }

  if (params.kind === "kysely") {
    const tableNames = {
      user: "users",
      session: "users_sessions",
    } satisfies Record<string, keyof AuthDb>;
    const adapter = new NodePostgresAdapter(params.pool, tableNames);
    const authRepository = createKyselyAuthRepository(params.db);
    return {
      lucia: createLucia({ adapter, secure: params.secure }),
      authRepository: authRepository,
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
