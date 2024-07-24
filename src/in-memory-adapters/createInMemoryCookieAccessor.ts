import type { CookieAccessor } from "../types";

export const createInMemoryCookieAccessor = () => {
  const cookies: Record<string, { key: string; value: string }> = {};
  return (() => ({
    get: (name: string) => cookies[name],
    set: (name: string, value: string) => {
      cookies[name] = { key: name, value };
    },
    cookies,
  })) satisfies CookieAccessor;
};
