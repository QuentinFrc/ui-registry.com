/**
 * @ui-registry/dialog-stack — push dialogs from anywhere, render them in one place.
 *
 * The provider renders the stack recursively: each entry's root wraps the
 * entries above it, so a headless dialog library that tracks nesting through
 * React context (e.g. Base UI) sees a real nested dialog tree. Focus
 * trapping, Escape, and nested styling hooks come from that library.
 *
 * ```tsx
 * const useConfirm = createDialogStack(ConfirmDialog);
 *
 * <DialogStackProvider root={StackRoot}>
 *   <App />
 * </DialogStackProvider>
 *
 * const confirm = useConfirm();
 * confirm.push({ title: "Delete?" }, { dismissible: false });
 * ```
 */

import {
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createDialogStackStore,
  type DialogStackEntry,
  type DialogStackStore,
  type PushOptions,
} from "./store.js";

export type { DialogStackEntry, PushOptions } from "./store.js";

/** Props the stack injects into every stacked component. */
export interface DialogSlotProps {
  /** Closes this dialog and every dialog above it. */
  close(): void;
  /** Open dialogs above this one (0 = topmost). */
  depth: number;
  dialogId: string;
  /** Closes the topmost dialog. */
  pop(): void;
  /** Closes the dialog with this id and every dialog above it. */
  popTo(id: string): void;
  /** Number of open dialogs. */
  stackSize: number;
}

/**
 * Contract for the `root` adapter: a dialog root (e.g. Base UI `Dialog.Root`)
 * that is controlled by the stack.
 */
export interface DialogStackRootProps {
  children: ReactNode;
  /** `false`: the adapter must ignore Escape / outside press. */
  dismissible: boolean;
  onOpenChange(open: boolean): void;
  /** Must be called with `false` once the exit animation has ended. */
  onOpenChangeComplete(open: boolean): void;
  open: boolean;
}

export type OwnProps<P> = Omit<P, keyof DialogSlotProps>;

type PushArgs<P> =
  Partial<OwnProps<P>> extends OwnProps<P>
    ? [props?: OwnProps<P>, options?: PushOptions]
    : [props: OwnProps<P>, options?: PushOptions];

type SlotKeys<P> = keyof P & keyof DialogSlotProps;

/** Rejects components that declare a slot prop with an incompatible type. */
type SlotCompatible<P> =
  Pick<DialogSlotProps, SlotKeys<P>> extends Pick<P, SlotKeys<P>>
    ? unknown
    : { "slot props must match DialogSlotProps": SlotKeys<P> };

export interface DialogStackControls {
  clear(): void;
  pop(): void;
  popTo(id: string): void;
  stack: readonly DialogStackEntry[];
}

export interface TypedDialogStack<P> extends DialogStackControls {
  /** Opens the component on top of the stack. Returns the entry id. */
  push(...args: PushArgs<P>): string;
  /** Swaps the topmost dialog for the component. Returns the entry id. */
  replace(...args: PushArgs<P>): string;
}

interface StackContextValue {
  Root: ComponentType<DialogStackRootProps>;
  store: DialogStackStore;
}

const StackContext = createContext<StackContextValue | null>(null);

function useStackContext(hook: string): StackContextValue {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error(`${hook} must be used within <DialogStackProvider>.`);
  }
  return context;
}

function useEntries(store: DialogStackStore) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}

interface DialogStackProviderProps {
  children?: ReactNode;
  /** Dialog root adapter, rendered once per entry. */
  root: ComponentType<DialogStackRootProps>;
}

/** Mount once near the app root. Stacked dialogs render after `children`. */
export function DialogStackProvider({
  children,
  root,
}: DialogStackProviderProps) {
  const [store] = useState(createDialogStackStore);
  const value = useMemo(() => ({ Root: root, store }), [root, store]);

  return (
    <StackContext.Provider value={value}>
      {children}
      <StackLevel index={0} />
    </StackContext.Provider>
  );
}

function StackLevel({ index }: { index: number }) {
  const { store } = useStackContext("StackLevel");
  const entry = useEntries(store)[index];
  if (!entry) {
    return null;
  }
  return <StackItem entry={entry} index={index} key={entry.id} />;
}

function StackItem({
  entry,
  index,
}: {
  entry: DialogStackEntry;
  index: number;
}) {
  const { Root, store } = useStackContext("StackItem");
  const entries = useEntries(store);
  // Mount closed, then open: dialog libraries only run enter transitions on
  // an open change, not when a root is mounted already open.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openEntries = entries.filter((e) => e.open);
  const slotProps: DialogSlotProps = {
    dialogId: entry.id,
    depth: openEntries.length - 1 - openEntries.indexOf(entry),
    stackSize: openEntries.length,
    close: () => store.close(entry.id),
    pop: store.pop,
    popTo: store.close,
  };
  const { Component } = entry;

  return (
    <Root
      dismissible={entry.dismissible}
      onOpenChange={(open) => {
        if (!open) {
          store.close(entry.id);
        }
      }}
      onOpenChangeComplete={(open) => {
        if (!open) {
          store.remove(entry.id);
        }
      }}
      open={mounted && entry.open}
    >
      <Component {...entry.props} {...slotProps} />
      <StackLevel index={index + 1} />
    </Root>
  );
}

/** Untyped controls, for closing dialogs you did not push yourself. */
export function useDialogStack(): DialogStackControls {
  const { store } = useStackContext("useDialogStack");
  const stack = useEntries(store);
  return useMemo(
    () => ({
      stack,
      pop: store.pop,
      popTo: store.close,
      clear: store.clear,
    }),
    [stack, store]
  );
}

/**
 * Binds a component to the stack and returns a hook whose `push` / `replace`
 * are typed to the component's own props (slot props are injected).
 * The component renders the dialog content only; the stack owns the root.
 */
export function createDialogStack<P extends object>(
  Component: ComponentType<P> & SlotCompatible<P>
): () => TypedDialogStack<P> {
  return function useTypedDialogStack() {
    const { store } = useStackContext("createDialogStack hook");
    const controls = useDialogStack();

    return useMemo(() => {
      const toEntry = (
        props: OwnProps<P> | undefined,
        options: PushOptions | undefined
      ) => ({
        ...options,
        Component,
        props: { ...props },
      });
      return {
        ...controls,
        push: (...[props, options]: PushArgs<P>) =>
          store.push(toEntry(props, options)),
        replace: (...[props, options]: PushArgs<P>) =>
          store.replace(toEntry(props, options)),
      };
    }, [controls, store]);
  };
}
