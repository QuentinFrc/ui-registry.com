import type { ResolvedScrollOptions } from "./driver.js";
import type {
  Align,
  ErrorAction,
  Guide,
  GuideEntry,
  GuideManagerOptions,
  MissingAction,
  OnError,
  Side,
} from "./types.js";

export const DEFAULTS = Object.freeze({
  dismissible: true,
  onMissing: "skip" as MissingAction,
  waitTimeout: 3000,
  hookTimeout: 10_000,
  viewportMargin: 20,
  sideOffset: 16,
  spotlightPadding: 8,
  keyboard: true,
});

export const defaultOnError: OnError = (): ErrorAction => "end";

/** Manager-level options with defaults applied. */
export interface ManagerDefaults {
  dismissible: boolean;
  hookTimeout: number;
  keyboard: boolean;
  onError: OnError | undefined;
  onMissing: MissingAction;
  scroll: ResolvedScrollOptions;
  sideOffset: number;
  spotlightPadding: number;
  viewportMargin: number;
  waitTimeout: number;
}

export const resolveManagerDefaults = (
  options: Omit<GuideManagerOptions, "guides">
): ManagerDefaults => ({
  dismissible: options.dismissible ?? DEFAULTS.dismissible,
  onMissing: options.onMissing ?? DEFAULTS.onMissing,
  waitTimeout: options.waitTimeout ?? DEFAULTS.waitTimeout,
  hookTimeout: options.hookTimeout ?? DEFAULTS.hookTimeout,
  sideOffset: options.sideOffset ?? DEFAULTS.sideOffset,
  spotlightPadding: options.spotlightPadding ?? DEFAULTS.spotlightPadding,
  viewportMargin: options.viewportMargin ?? DEFAULTS.viewportMargin,
  keyboard: options.keyboard ?? DEFAULTS.keyboard,
  scroll: {
    behavior: options.scroll?.behavior ?? "auto",
    block: options.scroll?.block ?? "center",
    lock: options.scroll?.lock ?? false,
  },
  onError: options.onError,
});

/** Options of an entry, resolved entry > guide > manager > default. */
export interface ResolvedEntryOptions {
  align: Align;
  dismissible: boolean;
  hookTimeout: number;
  onMissing: MissingAction;
  side: Side;
  sideOffset: number;
  spotlightPadding: number;
  waitTimeout: number;
}

export const resolveEntryOptions = (
  entry: GuideEntry,
  guide: Guide,
  manager: ManagerDefaults
): ResolvedEntryOptions => ({
  dismissible: entry.dismissible ?? guide.dismissible ?? manager.dismissible,
  onMissing: entry.onMissing ?? guide.onMissing ?? manager.onMissing,
  waitTimeout: entry.waitTimeout ?? guide.waitTimeout ?? manager.waitTimeout,
  hookTimeout: entry.hookTimeout ?? guide.hookTimeout ?? manager.hookTimeout,
  side: entry.side ?? entry.step.side,
  align: entry.align ?? entry.step.align,
  sideOffset: entry.step.sideOffset ?? manager.sideOffset,
  spotlightPadding: entry.step.spotlightPadding ?? manager.spotlightPadding,
});

/** `onError` resolved guide > manager > default (`"end"`). */
export const resolveOnError = (
  guide: Guide,
  manager: ManagerDefaults
): OnError => guide.onError ?? manager.onError ?? defaultOnError;

/** Hook timeout of a guide outside of an entry (e.g. `onError`). */
export const resolveGuideHookTimeout = (
  guide: Guide,
  manager: ManagerDefaults
): number => guide.hookTimeout ?? manager.hookTimeout;
