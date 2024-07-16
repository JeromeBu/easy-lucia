import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";
import type { TableNames } from "@lucia-auth/adapter-postgresql/dist/base";
import { Lucia } from "lucia";
import type { Pool } from "pg";

type AdapterParams =
  | { mode: "in-memory" }
  | { mode: "pg"; pool: Pool; tableNames: TableNames };

type CreateLuciaDependencies = {
  env: "production" | string;
} & AdapterParams;

export const createLucia = ({ env, ...adapterParams }: CreateLuciaDependencies) => {
  const adapter = getAdapter(adapterParams);
  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: env === "production", // set `Secure` flag in HTTPS
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

const getAdapter = (params: AdapterParams) => {
  if (params.mode === "pg") {
    return new NodePostgresAdapter(params.pool, params.tableNames);
  }

  throw new Error("Not implemented, only pg adapter is supported for now");
};

export const hashingParams = {
  // recommended minimum parameters
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof createLucia>;
    DatabaseUserAttributes: {
      email: string;
      emailVerifiedAt: Date | null;
    };
  }
}
