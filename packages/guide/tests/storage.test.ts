import { describe, expect, it, vi } from "vitest";
import {
  localStorageAdapter,
  memoryAdapter,
  parseRecord,
} from "../src/storage.js";
import type { GuideRecord } from "../src/types.js";

const record: GuideRecord = {
  status: "in-progress",
  version: 1,
  stepId: "a",
  updatedAt: 1,
};

const createFakeWindow = () => {
  const values = new Map<string, string>();
  const listeners = new Set<(event: { key: string | null }) => void>();
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
  return {
    values,
    localStorage,
    addEventListener: vi.fn(
      (_type: string, listener: (event: { key: string | null }) => void) =>
        listeners.add(listener)
    ),
    removeEventListener: vi.fn(
      (_type: string, listener: (event: { key: string | null }) => void) =>
        listeners.delete(listener)
    ),
    dispatch: (key: string | null) => {
      for (const listener of listeners) {
        listener({ key });
      }
    },
  };
};

describe("parseRecord", () => {
  it("parses valid records and rejects everything else", () => {
    expect(parseRecord(JSON.stringify(record))).toEqual(record);
    expect(parseRecord(null)).toBeNull();
    expect(parseRecord("{not json")).toBeNull();
    expect(parseRecord("null")).toBeNull();
    expect(parseRecord("42")).toBeNull();
    expect(parseRecord(JSON.stringify({ ...record, status: "nope" }))).toBe(
      null
    );
    expect(parseRecord(JSON.stringify({ ...record, version: "1" }))).toBe(null);
    expect(parseRecord(JSON.stringify({ ...record, updatedAt: null }))).toBe(
      null
    );
  });
});

describe("memoryAdapter", () => {
  it("reads initial records, writes and removes copies", async () => {
    const storage = memoryAdapter({ g: record });
    const read = await storage.get("g");
    expect(read).toEqual(record);
    expect(await storage.get("unknown")).toBeNull();
    await storage.set("h", { ...record, status: "completed" });
    expect(await storage.get("h")).toMatchObject({ status: "completed" });
    await storage.remove("g");
    expect(await storage.get("g")).toBeNull();
    expect(storage.subscribe).toBeUndefined();
  });

  it("defaults to empty", async () => {
    expect(await memoryAdapter().get("g")).toBeNull();
  });
});

describe("localStorageAdapter", () => {
  it("stores JSON under the default prefix", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake);
    const storage = localStorageAdapter();
    await storage.set("g", record);
    expect(fake.values.get("guide:g")).toBe(JSON.stringify(record));
    expect(await storage.get("g")).toEqual(record);
    await storage.remove("g");
    expect(fake.values.has("guide:g")).toBe(false);
    expect(await storage.get("g")).toBeNull();
  });

  it("uses a custom prefix", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake);
    await localStorageAdapter({ prefix: "app/" }).set("g", record);
    expect(fake.values.has("app/g")).toBe(true);
  });

  it("reads invalid JSON as null", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake);
    fake.values.set("guide:g", "{oops");
    expect(await localStorageAdapter().get("g")).toBeNull();
  });

  it("swallows read exceptions", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake);
    fake.localStorage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(await localStorageAdapter().get("g")).toBeNull();
  });

  it("falls back to memory when writes throw (quota, private mode)", async () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake);
    fake.localStorage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    fake.localStorage.removeItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const storage = localStorageAdapter();
    await expect(storage.set("g", record)).resolves.toBeUndefined();
    expect(await storage.get("g")).toEqual(record);
    await expect(storage.remove("g")).resolves.toBeUndefined();
    expect(await storage.get("g")).toBeNull();
    expect(fake.localStorage.getItem).not.toHaveBeenCalled();
  });

  it("behaves as memory without window", async () => {
    const storage = localStorageAdapter();
    expect(await storage.get("g")).toBeNull();
    await storage.set("g", record);
    expect(await storage.get("g")).toEqual(record);
    const unsubscribe = storage.subscribe?.(() => undefined);
    expect(unsubscribe?.()).toBeUndefined();
  });

  it("notifies cross-tab changes of its keys only", () => {
    const fake = createFakeWindow();
    vi.stubGlobal("window", fake);
    const notify = vi.fn();
    const unsubscribe = localStorageAdapter().subscribe?.(notify) as () => void;
    fake.dispatch("guide:g");
    fake.dispatch("other");
    fake.dispatch(null);
    expect(notify).toHaveBeenCalledTimes(2);
    unsubscribe();
    fake.dispatch("guide:g");
    expect(notify).toHaveBeenCalledTimes(2);
    expect(fake.removeEventListener).toHaveBeenCalledWith(
      "storage",
      expect.any(Function)
    );
  });
});
