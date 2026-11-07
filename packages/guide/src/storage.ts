import type { GuideRecord, GuideStorage, RecordStatus } from "./types.js";

const STATUSES: readonly RecordStatus[] = [
  "in-progress",
  "completed",
  "dismissed",
];

const isRecord = (value: unknown): value is GuideRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<GuideRecord>;
  return (
    STATUSES.includes(candidate.status as RecordStatus) &&
    typeof candidate.version === "number" &&
    typeof candidate.updatedAt === "number"
  );
};

/** Parses a stored value; anything invalid resolves to `null`. */
export const parseRecord = (raw: string | null): GuideRecord | null => {
  if (raw === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
};

/**
 * In-memory storage: tests and environments without `window`.
 */
export const memoryAdapter = (
  initial: Record<string, GuideRecord> = {}
): GuideStorage => {
  const records = new Map<string, GuideRecord>(
    Object.entries(initial).map(([id, record]) => [id, { ...record }])
  );
  return {
    get: (guideId) => {
      const record = records.get(guideId);
      return Promise.resolve(record ? { ...record } : null);
    },
    set: (guideId, record) => {
      records.set(guideId, { ...record });
      return Promise.resolve();
    },
    remove: (guideId) => {
      records.delete(guideId);
      return Promise.resolve();
    },
  };
};

export interface LocalStorageAdapterOptions {
  /** Key prefix. Default `"guide:"`. */
  prefix?: string;
}

const getLocalStorage = (): Storage | null =>
  typeof window === "undefined" ? null : window.localStorage;

/**
 * `localStorage` storage (default of the manager): JSON values under
 * `${prefix}${guideId}`. Invalid values read as `null`; exceptions (quota,
 * private mode, no `window`) are swallowed and the adapter falls back to an
 * in-memory copy. `subscribe` listens to the `storage` event (cross-tab).
 */
export const localStorageAdapter = ({
  prefix = "guide:",
}: LocalStorageAdapterOptions = {}): GuideStorage => {
  // Values whose write failed (or without `window`): `null` means removed.
  const memory = new Map<string, string | null>();
  const key = (guideId: string) => `${prefix}${guideId}`;

  const read = (guideId: string): string | null => {
    if (memory.has(guideId)) {
      return memory.get(guideId) as string | null;
    }
    try {
      return getLocalStorage()?.getItem(key(guideId)) ?? null;
    } catch {
      return null;
    }
  };

  const write = (guideId: string, value: string | null): void => {
    try {
      const storage = getLocalStorage();
      if (!storage) {
        throw new Error("localStorage is unavailable.");
      }
      if (value === null) {
        storage.removeItem(key(guideId));
      } else {
        storage.setItem(key(guideId), value);
      }
      memory.delete(guideId);
    } catch {
      memory.set(guideId, value);
    }
  };

  return {
    get: (guideId) => Promise.resolve(parseRecord(read(guideId))),
    set: (guideId, record) => {
      write(guideId, JSON.stringify(record));
      return Promise.resolve();
    },
    remove: (guideId) => {
      write(guideId, null);
      return Promise.resolve();
    },
    subscribe: (notify) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key.startsWith(prefix)) {
          notify();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
};
