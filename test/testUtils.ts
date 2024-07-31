import { expect } from "vitest";
import { type AuthUseCases, createAuthUseCases } from "../src";
import {
  InMemoryAuthRepository,
  InMemoryLuciaAdapter,
  createInMemoryLucia,
} from "../src/in-memory-adapters";
import { InMemoryCookieAccessor } from "../src/in-memory-adapters/InMemoryCookieAccessor";
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

export const createTestUseCases = (config: {
  hashingParams: HashingParams;
  resetPasswordBaseUrl: string;
}): {
  authRepository: InMemoryAuthRepository;
  useCases: AuthUseCases;
  sentEmails: SentEmail[];
  inMemoryCookieAccessor: InMemoryCookieAccessor;
  inMemoryLuciaAdapter: InMemoryLuciaAdapter;
} => {
  const inMemoryCookieAccessor = new InMemoryCookieAccessor();
  const authRepository = new InMemoryAuthRepository();
  const inMemoryLuciaAdapter = new InMemoryLuciaAdapter(authRepository.user);
  const inMemoryLucia = createInMemoryLucia(inMemoryLuciaAdapter);

  const sentEmails: SentEmail[] = [];

  const useCases = createAuthUseCases({
    cookieAccessor: inMemoryCookieAccessor,
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
    resetPasswordBaseUrl: config.resetPasswordBaseUrl,
    hashingParams: config.hashingParams,
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
