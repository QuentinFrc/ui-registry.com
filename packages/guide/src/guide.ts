import type {
  Guide,
  GuideEntry,
  GuideOptions,
  GuideRoute,
  GuideStep,
  GuideTrigger,
  ResolvedTrigger,
} from "./types.js";

const DEFAULT_VISIBLE_THRESHOLD = 0.5;

const isEntry = (value: GuideStep | GuideEntry): value is GuideEntry =>
  "step" in value;

/** A bare step becomes `{ step }`; an entry is copied. */
export const normalizeEntry = (value: GuideStep | GuideEntry): GuideEntry =>
  isEntry(value) ? { ...value } : { step: value };

/**
 * Sets `route` on every entry, keeping existing hooks and overrides.
 */
export const onPage = (
  route: GuideRoute,
  steps: readonly (GuideStep | GuideEntry)[]
): GuideEntry[] => steps.map((value) => ({ ...normalizeEntry(value), route }));

const resolveTrigger = (trigger: GuideTrigger | undefined): ResolvedTrigger => {
  if (trigger === undefined || trigger === "manual") {
    return { on: "manual" };
  }
  if (trigger === "visible") {
    return { on: "visible", delay: 0, threshold: DEFAULT_VISIBLE_THRESHOLD };
  }
  return {
    on: "visible",
    delay: trigger.delay ?? 0,
    threshold: trigger.threshold ?? DEFAULT_VISIBLE_THRESHOLD,
  };
};

const assertUniqueSteps = (id: string, entries: readonly GuideEntry[]) => {
  const seen = new Set<string>();
  for (const { step } of entries) {
    if (seen.has(step.id)) {
      throw new Error(
        `defineGuide("${id}"): step "${step.id}" appears more than once.`
      );
    }
    seen.add(step.id);
  }
};

/**
 * Declares a guide: ordered steps (bare or entries), pages, lifecycle, mode,
 * trigger and persistence options. Returns a frozen, normalized guide.
 */
export const defineGuide = (options: GuideOptions): Guide => {
  if (typeof options.id !== "string" || options.id.length === 0) {
    throw new Error("defineGuide: `id` must be a non-empty string.");
  }
  if (options.steps.length === 0) {
    throw new Error(
      `defineGuide("${options.id}"): at least one step is required.`
    );
  }
  const steps = options.steps.map((value) =>
    Object.freeze(normalizeEntry(value))
  );
  assertUniqueSteps(options.id, steps);
  return Object.freeze({
    id: options.id,
    version: options.version ?? 1,
    mode: options.mode ?? "modal",
    trigger: Object.freeze(resolveTrigger(options.trigger)),
    when: options.when,
    dismissible: options.dismissible,
    onMissing: options.onMissing,
    waitTimeout: options.waitTimeout,
    hookTimeout: options.hookTimeout,
    onError: options.onError,
    steps: Object.freeze(steps),
  });
};

const QUERY_OR_HASH = /[?#].*$/;

const stripQuery = (path: string): string => path.replace(QUERY_OR_HASH, "");

/** Exact pathname match for strings (query and hash stripped), predicate otherwise. */
export const matchRoute = (route: GuideRoute, pathname: string): boolean => {
  const path = stripQuery(pathname);
  return typeof route === "string" ? stripQuery(route) === path : route(path);
};
