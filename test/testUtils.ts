import { expect } from "vitest";
import { createAuthUseCases } from "../src";
import { InMemoryAuthRepository } from "../src/in-memory-adapter/InMemoryAuthRepository";
import { InMemoryLuciaAdapter } from "../src/in-memory-adapter/InMemoryLuciaAdapter";
import { createInMemoryCookieAccessor } from "../src/in-memory-adapter/createInMemoryCookieAccessor";
import { createInMemoryLucia } from "../src/in-memory-adapter/createInMemoryLucia";
import type { HashingParams } from "../src/types";

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

export const createTestUseCases = (hashingParams: HashingParams) => {
  const inMemoryCookieAccessor = createInMemoryCookieAccessor();
  const authRepository = new InMemoryAuthRepository();
  const inMemoryLuciaAdapter = new InMemoryLuciaAdapter(authRepository.user);
  const inMemoryLucia = createInMemoryLucia(inMemoryLuciaAdapter);

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
    hashingParams,
  });

  return {
    authRepository,
    useCases,
    sentEmails,
    inMemoryCookieAccessor,
    inMemoryLuciaAdapter,
  };
};

export const expectToEqual = <T>(actual: T, expected: T) => {
  expect(actual).toEqual(expected);
};

export const expectToMatch = <T>(actual: T, expected: Partial<T>) => {
  expect(actual).toMatchObject(expected);
};

export const expectObjectToMatchInArray = <T>(
  actualArray: T[],
  expectedArray: Partial<T>[],
) => {
  expect(actualArray.length).toBe(expectedArray.length);
  actualArray.forEach((item, index) => {
    expectToMatch(item, expectedArray[index]);
  });
};

export const expectPromiseToFailWith = (promise: Promise<any>, expectedError: string) => {
  expect(promise).rejects.toThrow(expectedError);
};
