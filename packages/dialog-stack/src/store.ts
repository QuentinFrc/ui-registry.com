import type { ComponentType } from "react";

/** One dialog in the stack. Entries are ordered bottom (index 0) to top. */
export interface DialogStackEntry {
  // biome-ignore lint/suspicious/noExplicitAny: entries are type-erased; the typed hook restores the props contract.
  Component: ComponentType<any>;
  /** `false` while Escape / outside press must not close this entry. */
  dismissible: boolean;
  id: string;
  onClose?: () => void;
  /** `false` once closing: the entry stays mounted until its exit animation ends. */
  open: boolean;
  props: Record<string, unknown>;
}

export interface PushOptions {
  /** Whether Escape / outside press closes this dialog. @default true */
  dismissible?: boolean;
  /** Stable id, useful for `popTo()`. Auto-generated when omitted. */
  id?: string;
  /** Called once the entry has left the stack (after its exit animation). */
  onClose?: () => void;
}

export type NewEntry = Pick<DialogStackEntry, "Component" | "props"> &
  PushOptions;

export interface DialogStackStore {
  /** Closes every open dialog. */
  clear(): void;
  /** Starts closing `id` and every dialog above it. */
  close(id: string): void;
  getSnapshot(): readonly DialogStackEntry[];
  /** Closes the topmost open dialog. */
  pop(): void;
  push(entry: NewEntry): string;
  /** Drops `id` and everything above it. Called once exit animations end. */
  remove(id: string): void;
  /** Swaps the topmost open dialog, or pushes when the stack is empty. */
  replace(entry: NewEntry): string;
  subscribe(listener: () => void): () => void;
}

let counter = 0;
const nextId = () => {
  counter += 1;
  return `dialog-stack-${counter}`;
};

const toEntry = ({
  id,
  dismissible = true,
  ...rest
}: NewEntry): DialogStackEntry => ({
  ...rest,
  id: id ?? nextId(),
  dismissible,
  open: true,
});

export function createDialogStackStore(): DialogStackStore {
  let entries: readonly DialogStackEntry[] = [];
  const listeners = new Set<() => void>();

  const commit = (next: readonly DialogStackEntry[]) => {
    const kept = new Set(next.map((entry) => entry.id));
    const removed = entries.filter((entry) => !kept.has(entry.id));
    entries = next;
    for (const listener of listeners) {
      listener();
    }
    for (const entry of removed) {
      entry.onClose?.();
    }
  };

  // A new dialog must never end up nested under one that is animating out:
  // when that one unmounts, the new dialog would remount at a lower level.
  const withoutClosing = () => entries.filter((entry) => entry.open);

  const close = (id: string) => {
    const index = entries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return;
    }
    commit(
      entries.map((entry, i) =>
        i >= index && entry.open ? { ...entry, open: false } : entry
      )
    );
  };

  return {
    getSnapshot: () => entries,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    push(input) {
      const entry = toEntry(input);
      commit([...withoutClosing(), entry]);
      return entry.id;
    },
    replace(input) {
      const entry = toEntry(input);
      commit([...withoutClosing().slice(0, -1), entry]);
      return entry.id;
    },
    pop() {
      const top = withoutClosing().at(-1);
      if (top) {
        close(top.id);
      }
    },
    close,
    clear() {
      const bottom = entries[0];
      if (bottom) {
        close(bottom.id);
      }
    },
    remove(id) {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index === -1 || entries[index]?.open) {
        return;
      }
      commit(entries.slice(0, index));
    },
  };
}
