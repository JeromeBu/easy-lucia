import type { Cookie } from "lucia";
import type { CookieAccessor } from "../types";

export class InMemoryCookieAccessor implements CookieAccessor {
  #cookies: Record<string, Cookie> = {};

  get(name: string): Cookie | undefined {
    return this.#cookies[name];
  }

  set(cookie: Cookie): void {
    this.#cookies[cookie.name] = cookie;
  }

  get cookies(): Pick<Cookie, "name" | "value">[] {
    return Object.values(this.#cookies).map(({ name, value }) => ({ name, value }));
  }
}
