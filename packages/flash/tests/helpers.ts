import { vi } from "vitest";

export function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

/** Stubs `window` (location + sessionStorage) and `history` for a browser test. */
export function stubBrowser(href: string) {
  const location = { href };
  const replaceState = vi.fn((_state: unknown, _title: string, url: string) => {
    location.href = new URL(url, location.href).toString();
  });
  vi.stubGlobal("window", { location, sessionStorage: fakeStorage() });
  vi.stubGlobal("history", { state: { keep: true }, replaceState });
  return { location, replaceState };
}
