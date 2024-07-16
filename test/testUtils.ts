import { expect } from "vitest";
import { createAuthUseCases } from "../src";
import { InMemoryAuthRepository } from "../src/in-memory-adapter/InMemoryAuthRepository";
import { createInMemoryLucia } from "../src/in-memory-adapter/createInMemoryLucia";

export type SentEmail =
  | {
      kind: "sendVerificationCode";
      params: {
        email: string;
        code: string;
      };
    }
  | {
      kind: "sendPasswordResetLink";
      params: {
        email: string;
        verificationLink: string;
      };
    };

export const createTestUseCases = () => {
  const authRepository = new InMemoryAuthRepository();
  const inMemoryLucia = createInMemoryLucia(authRepository.user);

  const sentEmails: SentEmail[] = [];

  const useCases = createAuthUseCases({
    lucia: inMemoryLucia,
    authRepository,
    emails: {
      sendVerificationCode: async (params) => {
        sentEmails.push({ kind: "sendVerificationCode", params });
      },
      sendPasswordResetLink: async (params) => {
        sentEmails.push({ kind: "sendPasswordResetLink", params });
      },
    },
    resetPasswordBaseUrl: "",
  });

  return {
    authRepository,
    useCases,
    sentEmails,
  };
};

export const expectToEqual = <T>(actual: T, expected: T) => {
  expect(actual).toEqual(expected);
};

export const expectToMatch = <T>(actual: T, expected: Partial<T>) => {
  expect(actual).toMatchObject(expected);
};
