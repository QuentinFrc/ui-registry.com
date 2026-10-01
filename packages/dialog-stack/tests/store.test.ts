import { describe, expect, it, vi } from "vitest";
import { createDialogStackStore } from "../src/store.js";

const Noop = () => null;
const entry = (id: string, onClose?: () => void) => ({
  Component: Noop,
  props: {},
  id,
  onClose,
});
const snapshot = (store: ReturnType<typeof createDialogStackStore>) =>
  store
    .getSnapshot()
    .map(({ id, open }) => `${id}:${open ? "open" : "closing"}`);

describe("createDialogStackStore", () => {
  it("pushes entries on top, open and dismissible by default", () => {
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.push(entry("b"));
    expect(snapshot(store)).toEqual(["a:open", "b:open"]);
    expect(store.getSnapshot()[0]?.dismissible).toBe(true);
  });

  it("generates ids when none is given", () => {
    const store = createDialogStackStore();
    const first = store.push({ Component: Noop, props: {} });
    const second = store.push({ Component: Noop, props: {} });
    expect(first).not.toBe(second);
  });

  it("pop closes the topmost open entry and keeps it mounted until removed", () => {
    const onClose = vi.fn();
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.push(entry("b", onClose));
    store.pop();
    expect(snapshot(store)).toEqual(["a:open", "b:closing"]);
    expect(onClose).not.toHaveBeenCalled();

    store.remove("b");
    expect(snapshot(store)).toEqual(["a:open"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pop skips entries already closing", () => {
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.push(entry("b"));
    store.pop();
    store.pop();
    expect(snapshot(store)).toEqual(["a:closing", "b:closing"]);
  });

  it("close / popTo closes the entry and everything above it", () => {
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.push(entry("b"));
    store.push(entry("c"));
    store.close("b");
    expect(snapshot(store)).toEqual(["a:open", "b:closing", "c:closing"]);
    store.remove("b");
    expect(snapshot(store)).toEqual(["a:open"]);
  });

  it("clear closes every entry", () => {
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.push(entry("b"));
    store.clear();
    expect(snapshot(store)).toEqual(["a:closing", "b:closing"]);
  });

  it("remove ignores open entries", () => {
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.remove("a");
    expect(snapshot(store)).toEqual(["a:open"]);
  });

  it("push drops closing entries so the new one is not nested under them", () => {
    const onClose = vi.fn();
    const store = createDialogStackStore();
    store.push(entry("a"));
    store.push(entry("b", onClose));
    store.pop();
    store.push(entry("c"));
    expect(snapshot(store)).toEqual(["a:open", "c:open"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("replace swaps the topmost entry, or pushes on an empty stack", () => {
    const onClose = vi.fn();
    const store = createDialogStackStore();
    store.replace(entry("a"));
    store.push(entry("b", onClose));
    store.replace(entry("c"));
    expect(snapshot(store)).toEqual(["a:open", "c:open"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("notifies subscribers until they unsubscribe", () => {
    const listener = vi.fn();
    const store = createDialogStackStore();
    const unsubscribe = store.subscribe(listener);
    store.push(entry("a"));
    unsubscribe();
    store.push(entry("b"));
    expect(listener).toHaveBeenCalledOnce();
  });
});
