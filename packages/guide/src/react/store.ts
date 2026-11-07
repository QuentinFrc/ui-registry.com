import {
  type ComponentType,
  createContext,
  use,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  GuideLayout,
  GuideManager,
  GuideRun,
  GuideState,
  GuideStep,
} from "../types.js";
import type { GuideContext, GuideRender, WithGuideContext } from "./types.js";

// ---------------------------------------------------------------------------
// Root context

export interface GuideRootValue {
  /** Prefix of the `ids` given to contents (unique per `GuideRoot`). */
  idPrefix: string;
  manager: GuideManager;
}

export const GuideRootContext = createContext<GuideRootValue | null>(null);

export const useGuideRoot = (caller: string): GuideRootValue => {
  const value = use(GuideRootContext);
  if (!value) {
    throw new Error(`${caller} must be used within <GuideRoot>.`);
  }
  return value;
};

// ---------------------------------------------------------------------------
// Subscriptions

interface Emitter {
  emit(): void;
  subscribe(listener: () => void): () => void;
}

const createEmitter = (): Emitter => {
  const listeners = new Set<() => void>();
  return {
    emit: () => {
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const registries = new WeakMap<GuideManager, Emitter>();

/**
 * Notified when a content is (un)registered on the manager: the manager has
 * no public channel for it, the Frame outlets re-read `getContent` on it.
 */
export const contentRegistry = (manager: GuideManager): Emitter => {
  let emitter = registries.get(manager);
  if (!emitter) {
    emitter = createEmitter();
    registries.set(manager, emitter);
  }
  return emitter;
};

/**
 * Selected slice of the manager's state. The result is cached per state and
 * selector, so a selector may derive a new object.
 */
export const useGuideState = <T>(
  manager: GuideManager,
  selector: (state: GuideState) => T
): T => {
  const cache = useRef<{
    state: GuideState;
    selector: (state: GuideState) => T;
    value: T;
  } | null>(null);
  const getSnapshot = useCallback(() => {
    const state = manager.getState();
    const cached = cache.current;
    if (cached && cached.state === state && cached.selector === selector) {
      return cached.value;
    }
    const value = selector(state);
    cache.current = { state, selector, value };
    return value;
  }, [manager, selector]);
  return useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot);
};

const noLayout = (): null => null;
const noSubscription = () => () => undefined;

/** Layout channel of a run (`null` without run or without active step). */
export const useGuideLayout = (
  manager: GuideManager,
  guideId: string | null
): GuideLayout | null => {
  const subscribe = useCallback(
    (listener: () => void) =>
      guideId === null
        ? noSubscription()
        : manager.subscribeLayout(guideId, listener),
    [manager, guideId]
  );
  const getSnapshot = useCallback(
    () => (guideId === null ? null : manager.getLayout(guideId)),
    [manager, guideId]
  );
  return useSyncExternalStore(subscribe, getSnapshot, noLayout);
};

// ---------------------------------------------------------------------------
// Guide context

const WHITESPACE = /\s+/g;

export type ActiveRun = GuideRun & { step: GuideStep };

export const createGuideContext = (
  manager: GuideManager,
  run: ActiveRun,
  idPrefix: string
): GuideContext => {
  const { guide, step, index, total, dismissible } = run;
  const base = `${idPrefix}${guide.id.replace(WHITESPACE, "-")}`;
  return {
    guide,
    step,
    mode: guide.mode,
    index,
    total,
    isFirst: index === 0,
    isLast: index === total - 1,
    dismissible,
    next: () => {
      manager.next(guide.id);
    },
    prev: () => {
      manager.prev(guide.id);
    },
    end: (reason) => {
      manager.end(guide.id, reason);
    },
    ids: { title: `${base}-title`, description: `${base}-description` },
  };
};

// ---------------------------------------------------------------------------
// Content slot

/**
 * What `useGuideAnchor` registers as the content of a step (`registerContent`).
 * Mutable: the anchor keeps the latest `content` / `render` in it and
 * notifies the Frame outlet; the outlet gives back its DOM node (portal mode).
 */
export interface ContentSlot {
  content: ComponentType<WithGuideContext> | undefined;
  getOutlet(): Element | null;
  getVersion(): number;
  notify(): void;
  portal: boolean;
  render: GuideRender | undefined;
  /** Sets the portal target; returns its release. */
  setOutlet(node: Element): () => void;
  subscribe(listener: () => void): () => void;
}

export const createContentSlot = (): ContentSlot => {
  const emitter = createEmitter();
  let version = 0;
  let outlet: Element | null = null;
  const notify = () => {
    version += 1;
    emitter.emit();
  };
  return {
    content: undefined,
    render: undefined,
    portal: false,
    getOutlet: () => outlet,
    getVersion: () => version,
    notify,
    subscribe: emitter.subscribe,
    setOutlet: (node) => {
      outlet = node;
      notify();
      return () => {
        if (outlet === node) {
          outlet = null;
          notify();
        }
      };
    },
  };
};
