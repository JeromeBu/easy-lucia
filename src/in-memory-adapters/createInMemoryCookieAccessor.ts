import type { MakeCookieAccessor } from "../types";

export const createInMemoryCookieAccessor = () => {
  const cookies: Record<string, { key: string; value: string }> = {};
  return (() => ({
    get: (name: string) => cookies[name],
    set: (name: string, value: string) => {
      cookies[name] = { key: name, value };
    },
    cookiesStored: Object.values(cookies),
  })) satisfies MakeCookieAccessor;
};
