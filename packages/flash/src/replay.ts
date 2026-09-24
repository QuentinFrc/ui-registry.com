/**
 * Client-side replay protection: consumed ids are remembered in
 * `sessionStorage` until their expiration. Best effort only — strict
 * single use requires a server-side `side` store, whose `clear` deletes the
 * source.
 */

const SEEN_KEY = "@ui-registry/flash:seen";
/** How long ids without an expiration are remembered. */
const DEFAULT_MEMORY_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 100;

type Seen = Record<string, number>;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Access can throw when storage is disabled.
    return null;
  }
}

function load(store: Storage, now: number): Seen {
  try {
    const parsed: unknown = JSON.parse(store.getItem(SEEN_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const live: Seen = {};
    for (const [id, until] of Object.entries(parsed)) {
      if (typeof until === "number" && until > now) {
        live[id] = until;
      }
    }
    return live;
  } catch {
    return {};
  }
}

export function hasSeen(id: string, now = Date.now()): boolean {
  const store = storage();
  return store ? Object.hasOwn(load(store, now), id) : false;
}

export function markSeen(
  id: string,
  exp: number | undefined,
  now = Date.now()
): void {
  const store = storage();
  if (!store) {
    return;
  }
  const seen = load(store, now);
  seen[id] = exp ?? now + DEFAULT_MEMORY_MS;
  const entries = Object.entries(seen)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_ENTRIES);
  try {
    store.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Quota exceeded or storage disabled: replay protection degrades silently.
  }
}
