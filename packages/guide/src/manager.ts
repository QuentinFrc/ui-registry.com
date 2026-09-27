import {
  callAsync,
  GuideTimeoutError,
  runBounded,
  waitUntil,
  withAbort,
} from "./async.js";
import { warn } from "./dev.js";
import type { GuideDriver, KeyIntent } from "./driver.js";
import { matchRoute } from "./guide.js";
import { createHeadlessDriver } from "./headless-driver.js";
import {
  type ManagerDefaults,
  type ResolvedEntryOptions,
  resolveEntryOptions,
  resolveGuideHookTimeout,
  resolveManagerDefaults,
  resolveOnError,
} from "./options.js";
import { resolveStepTarget } from "./step.js";
import { localStorageAdapter } from "./storage.js";
import type {
  AnchorOptions,
  Direction,
  EndReason,
  ErrorAction,
  ErrorPhase,
  Guide,
  GuideEntry,
  GuideEvent,
  GuideLayout,
  GuideManager,
  GuideManagerOptions,
  GuideRecord,
  GuideRouter,
  GuideRun,
  GuideState,
  GuideStep,
  Hook,
  HookContext,
  StartOptions,
  StartTrigger,
  StepLifecycle,
} from "./types.js";

export type CreateGuideManagerOptions = GuideManagerOptions & {
  /**
   * Environment of the manager (DOM access). Defaults to a headless driver.
   *
   * @internal
   */
  driver?: GuideDriver;
};

type LifecyclePhase = keyof StepLifecycle;

/** A run, as the manager tracks it. `snapshot` is the public view. */
interface RunInternal {
  controller: AbortController;
  /** Committed index, `-1` before the first commit. */
  current: number;
  ending: boolean;
  entries: GuideEntry[];
  guide: Guide;
  phase: "transitioning" | "active";
  /** Focus restore, scroll unlock. */
  releases: (() => void)[];
  snapshot: GuideRun | null;
  /** Latest requested index. */
  target: number;
  untrack: (() => void) | null;
}

/** Where a run starts. */
interface StartPoint {
  direction: Direction;
  index: number;
  resumed: boolean;
}

/** An armed `visible` trigger. */
interface Watcher {
  /** Observed step (first step, or the in-progress record's). */
  stepId: string;
  stop: () => void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

/** One `current → target` request of a run (§7). */
interface Transition {
  attempt: number;
  direction: Direction;
  from: number;
  /** `beforeLeave` of `from` already ran. */
  left: boolean;
  signal: AbortSignal;
  to: number;
}

/** Failure of a transition stage, attributed to the entry whose hook failed. */
class StageError extends Error {
  readonly phase: ErrorPhase;
  readonly error: unknown;
  readonly entry: GuideEntry;

  constructor(phase: ErrorPhase, error: unknown, entry: GuideEntry) {
    super(`Guide transition failed during "${phase}".`);
    this.name = "StageError";
    this.phase = phase;
    this.error = error;
    this.entry = entry;
  }
}

const noop = (): void => undefined;

const once = (fn: () => void): (() => void) => {
  let called = false;
  return () => {
    if (!called) {
      called = true;
      fn();
    }
  };
};

const isNonEmpty = ({ width, height }: { width: number; height: number }) =>
  width > 0 && height > 0;

const effectiveRecord = (
  guide: Guide,
  record: GuideRecord | null
): GuideRecord | null =>
  record && record.version >= guide.version ? record : null;

const indexGuides = (guides: readonly Guide[]): Map<string, Guide> => {
  const byId = new Map<string, Guide>();
  const steps = new Map<string, GuideStep>();
  for (const guide of guides) {
    if (byId.has(guide.id)) {
      throw new Error(`createGuideManager: duplicate guide id "${guide.id}".`);
    }
    byId.set(guide.id, guide);
    for (const { step } of guide.steps) {
      const known = steps.get(step.id);
      if (known && known !== step) {
        warn(`Two distinct steps share the id "${step.id}".`);
      }
      steps.set(step.id, step);
    }
  }
  return byId;
};

/**
 * Creates the guide manager: runs, transitions, records and events.
 * Vanilla; all DOM access goes through the (internal) driver.
 */
export const createGuideManager = (
  options: CreateGuideManagerOptions
): GuideManager => {
  const guides = indexGuides(options.guides);
  const defaults: ManagerDefaults = resolveManagerDefaults(options);
  const storage = options.storage ?? localStorageAdapter();
  const driver = options.driver ?? createHeadlessDriver();

  let destroyed = false;
  let runs: RunInternal[] = [];
  let records: Record<string, GuideRecord | null> = Object.fromEntries(
    options.guides.map((guide) => [guide.id, null])
  );
  let hydrated = false;
  let state: GuideState = { runs: [], records, hydrated };
  let router: GuideRouter | null = null;
  let pathname = "";
  let unbindKeys: (() => void) | null = null;

  const listeners = new Set<() => void>();
  const pathnameListeners = new Set<() => void>();
  const registryListeners = new Set<() => void>();
  const layouts = new Map<string, GuideLayout>();
  const layoutListeners = new Map<string, Set<() => void>>();
  const anchors = new Map<string, Map<Element, AnchorOptions>>();
  const contents = new Map<string, { entry: unknown }[]>();
  const lifecycles = new Map<string, StepLifecycle[]>();
  const frames = new Map<string, Element>();
  /** Local write counter, and the count of each guide's latest write. */
  let writeCount = 0;
  const writtenAt = new Map<string, number>();
  /** Latest hydration: an older one finishing late is discarded. */
  let hydrations = 0;
  let markHydrated: () => void = noop;
  const whenHydrated = new Promise<void>((resolve) => {
    markHydrated = resolve;
  });
  /** Guides that already had a run: the `visible` trigger does not re-arm. */
  const handled = new Set<string>();
  const queue: string[] = [];
  /** Armed `visible` triggers (callers check `watchers.has` first). */
  const watchers = new Map<string, Watcher>();

  // ---------------------------------------------------------------------------
  // Events & state

  const emit = (event: GuideEvent) => {
    try {
      options.onEvent?.(event);
    } catch (error) {
      warn("`onEvent` threw.", error);
    }
  };

  const entryOptions = (run: RunInternal, entry: GuideEntry) =>
    resolveEntryOptions(entry, run.guide, defaults);

  const currentEntry = (run: RunInternal): GuideEntry | null =>
    run.entries[run.current] ?? null;

  const currentStepId = (run: RunInternal): string | null =>
    currentEntry(run)?.step.id ?? null;

  const buildSnapshot = (run: RunInternal, suspended: boolean): GuideRun => {
    const entry = currentEntry(run);
    const index = entry ? run.current : run.target;
    return {
      guide: run.guide,
      status: suspended ? "suspended" : run.phase,
      step: entry?.step ?? null,
      entry,
      entries: run.entries,
      index,
      total: run.entries.length,
      dismissible: entryOptions(run, run.entries[index] as GuideEntry)
        .dismissible,
    };
  };

  /**
   * A run still ending (async cleanup) while a newer run of the same guide
   * started: hidden from the state and its end record is not written.
   */
  const isSuperseded = (run: RunInternal): boolean =>
    runs
      .slice(runs.indexOf(run) + 1)
      .some((other) => other.guide.id === run.guide.id);

  const refresh = () => {
    const modalRunning = runs.some((run) => run.guide.mode === "modal");
    const visible = runs.filter((run) => !isSuperseded(run));
    const events: GuideEvent[] = [];
    for (const run of visible) {
      const suspended = run.guide.mode === "passive" && modalRunning;
      const wasSuspended = run.snapshot?.status === "suspended";
      if (suspended !== wasSuspended) {
        events.push({
          type: suspended ? "suspend" : "resume",
          guideId: run.guide.id,
        });
      }
      run.snapshot = buildSnapshot(run, suspended);
    }
    state = {
      runs: visible.map((run) => run.snapshot as GuideRun),
      records,
      hydrated,
    };
    for (const listener of [...listeners]) {
      listener();
    }
    for (const event of events) {
      emit(event);
    }
  };

  const emitError = (
    run: RunInternal,
    failure: StageError,
    extra: { phase?: "cleanup"; error?: unknown; action?: ErrorAction } = {}
  ) => {
    emit({
      type: "error",
      guideId: run.guide.id,
      stepId: failure.entry.step.id,
      phase: extra.phase ?? failure.phase,
      error: "error" in extra ? extra.error : failure.error,
      ...(extra.action ? { action: extra.action } : {}),
    });
  };

  // ---------------------------------------------------------------------------
  // Records

  const writeRecord = (guide: Guide, record: GuideRecord | null) => {
    const previous = records[guide.id] ?? null;
    writeCount += 1;
    writtenAt.set(guide.id, writeCount);
    records = { ...records, [guide.id]: record };
    refresh();
    callAsync(() =>
      record ? storage.set(guide.id, record) : storage.remove(guide.id)
    ).catch((error: unknown) => {
      if (records[guide.id] === record) {
        records = { ...records, [guide.id]: previous };
        refresh();
      }
      emit({
        type: "error",
        guideId: guide.id,
        stepId: record?.stepId ?? null,
        phase: "storage",
        error,
      });
    });
  };

  const readRecord = async (
    guide: Guide
  ): Promise<[string, GuideRecord | null]> => {
    try {
      return [guide.id, effectiveRecord(guide, await storage.get(guide.id))];
    } catch (error) {
      emit({
        type: "error",
        guideId: guide.id,
        stepId: null,
        phase: "storage",
        error,
      });
      return [guide.id, records[guide.id] ?? null];
    }
  };

  const hydrate = async () => {
    hydrations += 1;
    const hydration = hydrations;
    const startedAt = writeCount;
    const loaded = await Promise.all(options.guides.map(readRecord));
    if (destroyed || hydration !== hydrations) {
      return;
    }
    const next = { ...records };
    for (const [guideId, record] of loaded) {
      // A local write made after this read started is newer: keep it.
      if ((writtenAt.get(guideId) ?? 0) <= startedAt) {
        next[guideId] = record;
      }
    }
    records = next;
    hydrated = true;
    refresh();
    syncTriggers();
    markHydrated();
  };

  const withStepId = (
    record: Omit<GuideRecord, "stepId">,
    stepId: string | null | undefined
  ): GuideRecord => (stepId ? { ...record, stepId } : record);

  const writeEndRecord = (
    run: RunInternal,
    reason: EndReason,
    errorPhase: string
  ) => {
    const { guide } = run;
    const base = { version: guide.version, updatedAt: Date.now() };
    const stepId = currentStepId(run);
    if (reason === "completed") {
      writeRecord(guide, { ...base, status: "completed" });
    } else if (reason === "dismissed") {
      writeRecord(guide, withStepId({ ...base, status: "dismissed" }, stepId));
    } else if (reason === "missing" || reason === "error") {
      const previous = records[guide.id];
      if (stepId === null && previous && previous.status !== "in-progress") {
        // Nothing was shown in this run: a completed or dismissed record
        // stays as it is (no downgrade to in-progress without a step).
        return;
      }
      const lastStepId =
        stepId ??
        (previous?.status === "in-progress" ? previous.stepId : undefined);
      writeRecord(
        guide,
        withStepId(
          {
            ...base,
            status: "in-progress",
            lastError: { phase: errorPhase, at: base.updatedAt },
          },
          lastStepId
        )
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Targets & layout

  const resolveElements = (step: GuideStep): Element[] => {
    const registered = anchors.get(step.id);
    return registered
      ? [...registered.keys()]
      : resolveStepTarget(step.target, driver.query);
  };

  const sizedTargets = (step: GuideStep): Element[] =>
    resolveElements(step).filter((element) =>
      isNonEmpty(driver.measure(element))
    );

  const expectsContent = (stepId: string): boolean =>
    [...(anchors.get(stepId)?.values() ?? [])].some(
      (anchor) => anchor.content === true
    );

  const isReady = (run: RunInternal, step: GuideStep): boolean => {
    const targets =
      run.guide.mode === "passive"
        ? sizedTargets(step).filter((element) => driver.isInViewport(element))
        : sizedTargets(step);
    return (
      targets.length > 0 && (!expectsContent(step.id) || contents.has(step.id))
    );
  };

  const subscribeChanges = (notify: () => void) => {
    const stopWatching = driver.watch(notify);
    registryListeners.add(notify);
    return () => {
      stopWatching();
      registryListeners.delete(notify);
    };
  };

  const subscribePathname = (notify: () => void) => {
    pathnameListeners.add(notify);
    return () => pathnameListeners.delete(notify);
  };

  const notifyLayout = (guideId: string) => {
    for (const listener of [...(layoutListeners.get(guideId) ?? [])]) {
      listener();
    }
  };

  const stopTracking = (run: RunInternal) => {
    run.untrack?.();
    run.untrack = null;
    if (layouts.delete(run.guide.id)) {
      notifyLayout(run.guide.id);
    }
  };

  const updateLayout = (run: RunInternal): boolean => {
    const step = (currentEntry(run) as GuideEntry).step;
    const rects = sizedTargets(step).map((element) => driver.measure(element));
    if (rects.length === 0) {
      lose(run);
      return false;
    }
    layouts.set(run.guide.id, { rects });
    notifyLayout(run.guide.id);
    return true;
  };

  const startTracking = (run: RunInternal) => {
    stopTracking(run);
    if (updateLayout(run)) {
      const step = (currentEntry(run) as GuideEntry).step;
      run.untrack = driver.track(sizedTargets(step), () => updateLayout(run));
    }
  };

  const setTransitioning = (run: RunInternal) => {
    stopTracking(run);
    run.phase = "transitioning";
    refresh();
  };

  const returnToCurrent = (run: RunInternal) => {
    run.phase = "active";
    run.target = run.current;
    refresh();
    startTracking(run);
  };

  const onRegistryChange = (stepId: string) => {
    for (const notify of [...registryListeners]) {
      notify();
    }
    for (const run of runs) {
      if (
        run.phase === "active" &&
        !run.ending &&
        currentStepId(run) === stepId
      ) {
        startTracking(run);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Hooks & routing

  const navigateTo = async (
    path: string,
    timeout: number,
    signal: AbortSignal
  ) => {
    if (matchRoute(path, pathname)) {
      return;
    }
    const current = router;
    if (!current) {
      warn(`Cannot navigate to "${path}": no router configured.`);
      throw new Error("No router configured: call `manager.setRouter()`.");
    }
    // The wait starts with the navigation: a `navigate` promise that never
    // settles is still bounded by `timeout`, and its rejection fails the wait.
    const failure = new AbortController();
    callAsync(() => current.navigate(path)).catch((error: unknown) =>
      failure.abort(error)
    );
    const reached = await waitUntil(
      () => matchRoute(path, pathname),
      subscribePathname,
      timeout,
      AbortSignal.any([signal, failure.signal])
    );
    if (!reached) {
      // Not a `GuideTimeoutError`: inside a hook, that one means the hook's
      // own `hookTimeout` (phase "timeout").
      throw new Error(
        `Pathname did not match "${path}" within ${timeout} ms of navigating.`
      );
    }
  };

  const waitForTarget = (
    target: GuideStep | string,
    timeout: number,
    signal: AbortSignal
  ) =>
    waitUntil(
      () =>
        (typeof target === "string"
          ? resolveStepTarget(target, driver.query)
          : resolveElements(target)
        ).some((element) => isNonEmpty(driver.measure(element))),
      subscribeChanges,
      timeout,
      signal
    );

  const hookContext = (
    run: RunInternal,
    transition: Transition,
    signal: AbortSignal
  ): HookContext => {
    const to = run.entries[transition.to] as GuideEntry;
    const { waitTimeout } = entryOptions(run, to);
    return {
      guide: run.guide,
      from: run.entries[transition.from]?.step ?? null,
      to: to.step,
      direction: transition.direction,
      signal,
      navigate: (path) => navigateTo(path, waitTimeout, signal),
      pathname,
      waitFor: (target, timeout = waitTimeout) =>
        waitForTarget(target, timeout, signal),
      manager,
    };
  };

  const runHook = async (
    hook: Hook | undefined,
    phase: LifecyclePhase,
    run: RunInternal,
    transition: Transition,
    entry: GuideEntry
  ) => {
    if (!hook) {
      return;
    }
    try {
      await runBounded(
        (signal) => hook(hookContext(run, transition, signal)),
        entryOptions(run, entry).hookTimeout,
        transition.signal
      );
    } catch (error) {
      throw new StageError(
        error instanceof GuideTimeoutError ? "timeout" : phase,
        error,
        entry
      );
    }
  };

  const runLocalHooks = async (
    phase: LifecyclePhase,
    run: RunInternal,
    transition: Transition,
    entry: GuideEntry
  ) => {
    for (const hooks of [...(lifecycles.get(entry.step.id) ?? [])]) {
      await runHook(hooks[phase], phase, run, transition, entry);
    }
  };

  const ensureRoute = async (
    run: RunInternal,
    transition: Transition,
    entry: GuideEntry
  ) => {
    const { route } = entry;
    if (route === undefined || matchRoute(route, pathname)) {
      return;
    }
    try {
      if (typeof route !== "string") {
        throw new Error(
          `Pathname "${pathname}" does not match the route of step "${entry.step.id}".`
        );
      }
      await navigateTo(
        route,
        entryOptions(run, entry).waitTimeout,
        transition.signal
      );
    } catch (error) {
      throw new StageError("route", error, entry);
    }
  };

  const scrollTo = async (
    run: RunInternal,
    step: GuideStep,
    signal: AbortSignal
  ) => {
    if (run.guide.mode !== "modal") {
      return;
    }
    await withAbort(
      driver
        .scrollIntoView(sizedTargets(step), defaults.scroll, signal)
        .catch(noop),
      signal
    );
  };

  const waitForEntry = (
    run: RunInternal,
    entry: GuideEntry,
    options: ResolvedEntryOptions,
    signal: AbortSignal
  ) =>
    waitUntil(
      () => isReady(run, entry.step),
      subscribeChanges,
      options.waitTimeout,
      signal
    );

  // ---------------------------------------------------------------------------
  // Transitions (§7)

  const renewController = (run: RunInternal): AbortSignal => {
    run.controller.abort();
    run.controller = new AbortController();
    return run.controller.signal;
  };

  const request = (run: RunInternal, to: number, direction: Direction) => {
    const signal = renewController(run);
    run.target = to;
    setTransitioning(run);
    transition(run, {
      from: run.current,
      to,
      direction,
      signal,
      attempt: 1,
      left: false,
    });
  };

  const commit = (
    run: RunInternal,
    transition: Transition,
    from: GuideEntry | null,
    to: GuideEntry
  ) => {
    transition.signal.throwIfAborted();
    run.current = transition.to;
    run.target = transition.to;
    run.phase = "active";
    writeRecord(run.guide, {
      status: "in-progress",
      version: run.guide.version,
      stepId: to.step.id,
      updatedAt: Date.now(),
    });
    startTracking(run);
    emit({
      type: "step",
      guideId: run.guide.id,
      stepId: to.step.id,
      index: transition.to,
      from: from?.step.id ?? null,
      direction: transition.direction,
    });
  };

  const transition = async (run: RunInternal, t: Transition) => {
    const from = run.entries[t.from] ?? null;
    const to = run.entries[t.to] as GuideEntry;
    try {
      if (from && !t.left) {
        await runHook(from.beforeLeave, "beforeLeave", run, t, from);
        await runLocalHooks("beforeLeave", run, t, from);
      }
      t.left = true;
      await ensureRoute(run, t, to);
      await runHook(to.beforeEnter, "beforeEnter", run, t, to);
      const options = entryOptions(run, to);
      if (!(await waitForEntry(run, to, options, t.signal))) {
        await handleMissing(run, t, to);
        return;
      }
      await runLocalHooks("beforeEnter", run, t, to);
      await scrollTo(run, to.step, t.signal);
      commit(run, t, from, to);
      if (from) {
        await runLocalHooks("afterLeave", run, t, from);
        await runHook(from.afterLeave, "afterLeave", run, t, from);
      }
      await runHook(to.afterEnter, "afterEnter", run, t, to);
      await runLocalHooks("afterEnter", run, t, to);
    } catch (error) {
      if (!t.signal.aborted) {
        await handleError(run, t, error as StageError);
      }
    }
  };

  /** Moves past `t.to` in the transition's direction (skip). */
  const skipFrom = async (
    run: RunInternal,
    t: Transition,
    reason: "missing" | "error",
    errorPhase: string
  ) => {
    const delta = t.direction === "backward" ? -1 : 1;
    const next = t.to + delta;
    if (next >= 0 && next < run.entries.length) {
      if (run.current === t.to) {
        request(run, next, delta > 0 ? "forward" : "backward");
        return;
      }
      run.target = next;
      refresh();
      await transition(run, { ...t, to: next, attempt: 1, left: true });
      return;
    }
    if (delta > 0) {
      await endRun(run, "completed");
    } else if (run.current >= 0) {
      returnToCurrent(run);
    } else {
      await endRun(run, reason, errorPhase);
    }
  };

  const handleMissing = async (
    run: RunInternal,
    t: Transition,
    entry: GuideEntry
  ) => {
    const { onMissing, waitTimeout } = entryOptions(run, entry);
    warn(
      `Step "${entry.step.id}" of guide "${run.guide.id}" has no target${
        expectsContent(entry.step.id) ? " or content" : ""
      } after ${waitTimeout} ms.`
    );
    emit({
      type: "missing",
      guideId: run.guide.id,
      stepId: entry.step.id,
      action: onMissing,
    });
    if (onMissing === "end") {
      await endRun(run, "missing", "missing");
      return;
    }
    await skipFrom(run, t, "missing", "missing");
  };

  /** Active anchor lost (§10): back to the wait of the current step. */
  const lose = (run: RunInternal) => {
    setTransitioning(run);
    reenter(run);
  };

  const reenter = async (run: RunInternal) => {
    const signal = renewController(run);
    const entry = currentEntry(run) as GuideEntry;
    const t: Transition = {
      from: run.current,
      to: run.current,
      direction: "forward",
      signal,
      attempt: 1,
      left: true,
    };
    try {
      if (await waitForEntry(run, entry, entryOptions(run, entry), signal)) {
        await scrollTo(run, entry.step, signal);
        returnToCurrent(run);
        return;
      }
    } catch {
      return;
    }
    await handleMissing(run, t, entry);
  };

  const resolveAction = async (
    run: RunInternal,
    t: Transition,
    failure: StageError
  ): Promise<ErrorAction | { failed: unknown }> => {
    try {
      return await runBounded(
        () =>
          resolveOnError(
            run.guide,
            defaults
          )({
            error: failure.error,
            phase: failure.phase,
            guide: run.guide,
            step: failure.entry.step,
            entry: failure.entry,
            direction: t.direction,
            attempt: t.attempt,
            manager,
          }),
        resolveGuideHookTimeout(run.guide, defaults),
        t.signal
      );
    } catch (error) {
      return { failed: error };
    }
  };

  const effectiveAction = (
    run: RunInternal,
    t: Transition,
    action: ErrorAction
  ): ErrorAction => {
    if (action === "retry") {
      return t.attempt >= 2 ? "end" : "retry";
    }
    if (action === "stay") {
      return run.current >= 0 && run.snapshot?.dismissible ? "stay" : "end";
    }
    return action === "skip" ? "skip" : "end";
  };

  const handleError = async (
    run: RunInternal,
    t: Transition,
    failure: StageError
  ) => {
    const resolved = await resolveAction(run, t, failure);
    if (t.signal.aborted) {
      return;
    }
    if (typeof resolved === "object") {
      emitError(run, failure, { action: "end" });
      emitError(run, failure, { error: resolved.failed, action: "end" });
      await endRun(run, "error", failure.phase);
      return;
    }
    const action = effectiveAction(run, t, resolved);
    emitError(run, failure, { action });
    if (action === "retry") {
      setTransitioning(run);
      await transition(run, { ...t, attempt: t.attempt + 1, left: false });
    } else if (action === "skip") {
      setTransitioning(run);
      await skipFrom(run, t, "error", failure.phase);
    } else if (action === "stay") {
      returnToCurrent(run);
    } else {
      await endRun(run, "error", failure.phase);
    }
  };

  // ---------------------------------------------------------------------------
  // End & cleanup (§8)

  const cleanupHooks = async (run: RunInternal) => {
    const entry = currentEntry(run);
    if (!entry) {
      return;
    }
    const t: Transition = {
      from: run.current,
      to: run.current,
      direction: "forward",
      signal: new AbortController().signal,
      attempt: 1,
      left: true,
    };
    const local = lifecycles.get(entry.step.id) ?? [];
    const steps: [Hook | undefined, LifecyclePhase][] = [
      ...local.map((hooks): [Hook | undefined, LifecyclePhase] => [
        hooks.beforeLeave,
        "beforeLeave",
      ]),
      [entry.beforeLeave, "beforeLeave"],
      ...local.map((hooks): [Hook | undefined, LifecyclePhase] => [
        hooks.afterLeave,
        "afterLeave",
      ]),
      [entry.afterLeave, "afterLeave"],
    ];
    for (const [hook, phase] of steps) {
      try {
        await runHook(hook, phase, run, t, entry);
      } catch (failure) {
        emitError(run, failure as StageError, { phase: "cleanup" });
      }
    }
  };

  const modalRun = (): RunInternal | undefined =>
    runs.find((run) => run.guide.mode === "modal" && !run.ending);

  const release = (run: RunInternal, reason: EndReason) => {
    for (const fn of run.releases.reverse()) {
      fn();
    }
    runs = runs.filter((other) => other !== run);
    if (runs.length === 0 && unbindKeys) {
      unbindKeys();
      unbindKeys = null;
    }
    emit({
      type: "end",
      guideId: run.guide.id,
      stepId: currentStepId(run),
      reason,
    });
    refresh();
    if (run.guide.mode === "modal") {
      processQueue();
    }
    syncTriggers();
  };

  const endRun = async (
    run: RunInternal,
    reason: EndReason,
    errorPhase: string = reason
  ) => {
    if (run.ending) {
      return;
    }
    run.ending = true;
    run.controller.abort();
    setTransitioning(run);
    try {
      await cleanupHooks(run);
      if (!isSuperseded(run)) {
        writeEndRecord(run, reason, errorPhase);
      }
    } finally {
      release(run, reason);
    }
  };

  // ---------------------------------------------------------------------------
  // Start (§3, §5)

  const whenContext = (guide: Guide) => ({ guide, pathname, manager });

  const isWhenOk = (guide: Guide) =>
    guide.when ? guide.when(whenContext(guide)) : true;

  const runOf = (guideId: string) =>
    runs.find((run) => run.guide.id === guideId && !run.ending);

  const resolveStart = (
    guide: Guide,
    entries: GuideEntry[],
    from: StartOptions["from"]
  ): StartPoint | null => {
    if (from === undefined || from === "resume") {
      const record = records[guide.id];
      const index =
        record?.status === "in-progress"
          ? entries.findIndex((entry) => entry.step.id === record.stepId)
          : -1;
      return index >= 0
        ? { index, resumed: true, direction: "jump" }
        : { index: 0, resumed: false, direction: "forward" };
    }
    if (from === "start") {
      return { index: 0, resumed: false, direction: "forward" };
    }
    const index = entries.findIndex((entry) => entry.step.id === from);
    return index >= 0 ? { index, resumed: false, direction: "jump" } : null;
  };

  const refuse = (guideId: string, why: string): false => {
    warn(`start("${guideId}") refused: ${why}.`);
    return false;
  };

  const checkStart = (
    guide: Guide,
    replace: boolean
  ): string | RunInternal | null => {
    if (destroyed) {
      return "the manager is destroyed";
    }
    if (runOf(guide.id)) {
      return "the guide is already running";
    }
    if (!isWhenOk(guide)) {
      return "the guide is not eligible (`when`)";
    }
    const existing = guide.mode === "modal" ? modalRun() : undefined;
    if (existing && !replace) {
      return `the modal guide "${existing.guide.id}" is running (use \`replace\`)`;
    }
    return existing ?? null;
  };

  /**
   * A modal run starting while another one is still ending (`replace`, or a
   * start during its cleanup) inherits its focus restore and scroll unlock:
   * capturing again would restore the focus to the leaving Frame and nest
   * the scroll lock (the inner lock would restore `overflow: hidden`).
   */
  const takeOverOrCapture = (run: RunInternal) => {
    const leaving = runs.find(
      (other) =>
        other.ending &&
        other.guide.mode === "modal" &&
        other.releases.length > 0
    );
    if (leaving) {
      run.releases = leaving.releases.splice(0);
      return;
    }
    run.releases.push(driver.captureFocus());
    if (defaults.scroll.lock) {
      run.releases.push(driver.lockScroll());
    }
  };

  const startRun = (
    guide: Guide,
    { from, replace = false }: StartOptions,
    trigger: StartTrigger
  ): boolean => {
    const check = checkStart(guide, replace);
    if (typeof check === "string") {
      return refuse(guide.id, check);
    }
    const ctx = whenContext(guide);
    const entries = guide.steps.filter(
      (entry) => !entry.when || entry.when(ctx)
    );
    const start = entries.length > 0 && resolveStart(guide, entries, from);
    if (!start) {
      return refuse(
        guide.id,
        entries.length > 0 ? `unknown step "${from}"` : "no eligible step"
      );
    }
    if (check) {
      endRun(check, "replaced");
    }
    const queued = queue.indexOf(guide.id);
    if (queued >= 0) {
      queue.splice(queued, 1);
    }
    handled.add(guide.id);
    const run: RunInternal = {
      guide,
      entries,
      current: -1,
      target: start.index,
      phase: "transitioning",
      controller: new AbortController(),
      ending: false,
      releases: [],
      untrack: null,
      snapshot: null,
    };
    runs = [...runs, run];
    if (defaults.keyboard && !unbindKeys) {
      unbindKeys = driver.listenKeys(onKey);
    }
    if (guide.mode === "modal") {
      takeOverOrCapture(run);
    }
    syncTriggers();
    const announce = (index: number, resumed: boolean) =>
      emit({
        type: "start",
        guideId: guide.id,
        stepId: (entries[index] as GuideEntry).step.id,
        resumed,
        trigger,
      });
    const begin = (point: StartPoint) => {
      announce(point.index, point.resumed);
      request(run, point.index, point.direction);
    };
    const resumes = from === undefined || from === "resume";
    if (hydrated || !resumes) {
      begin(start);
      return true;
    }
    // The default `from: "resume"` needs the records: the first transition
    // waits for the hydration (the run is listed, without a step, meanwhile).
    const initial = run.controller;
    refresh();
    whenHydrated.then(() => {
      if (run.ending) {
        return;
      }
      if (run.controller === initial) {
        begin(resolveStart(guide, entries, from) as StartPoint);
      } else {
        // Moved (next/prev/goTo) before the hydration: that request stands.
        announce(run.target, false);
      }
    });
    return true;
  };

  // ---------------------------------------------------------------------------
  // Triggers (§4)

  const allowsAutoStart = (guide: Guide) => {
    const record = records[guide.id];
    return !record || record.status === "in-progress";
  };

  const isEligible = (guide: Guide) =>
    isWhenOk(guide) && allowsAutoStart(guide);

  const triggerStep = (guide: Guide): GuideStep => {
    const record = records[guide.id];
    const resumed = guide.steps.find(
      (entry) =>
        record?.status === "in-progress" && entry.step.id === record.stepId
    );
    return (resumed ?? (guide.steps[0] as GuideEntry)).step;
  };

  const fire = (guide: Guide) => {
    if (!isEligible(guide)) {
      return;
    }
    if (guide.mode === "modal" && modalRun()) {
      queue.push(guide.id);
      syncTriggers();
      return;
    }
    startRun(guide, {}, "visible");
  };

  const disarm = (guideId: string) => {
    const watcher = watchers.get(guideId) as Watcher;
    clearTimeout(watcher.timer);
    watcher.stop();
    watchers.delete(guideId);
  };

  const arm = (guide: Guide, delay: number, threshold: number) => {
    const step = triggerStep(guide);
    const watcher: Watcher = { stepId: step.id, stop: noop, timer: undefined };
    watchers.set(guide.id, watcher);
    watcher.stop = driver.observeVisibility({
      resolve: () => resolveElements(step),
      subscribe: (notify) => {
        registryListeners.add(notify);
        return () => registryListeners.delete(notify);
      },
      threshold,
      onChange: (visible) => {
        clearTimeout(watcher.timer);
        if (!visible) {
          return;
        }
        if (delay > 0) {
          watcher.timer = setTimeout(() => fire(guide), delay);
        } else {
          fire(guide);
        }
      },
    });
  };

  const shouldArm = (guide: Guide) =>
    !(destroyed || handled.has(guide.id) || queue.includes(guide.id)) &&
    hydrated &&
    allowsAutoStart(guide);

  function syncTriggers() {
    for (const guide of guides.values()) {
      const { trigger } = guide;
      if (trigger.on === "manual") {
        continue;
      }
      const wanted = shouldArm(guide);
      const armed = watchers.get(guide.id);
      // Re-armed when the step to observe changed (record written elsewhere,
      // `resetRecord`).
      if (armed && !(wanted && armed.stepId === triggerStep(guide).id)) {
        disarm(guide.id);
      }
      if (wanted && !watchers.has(guide.id)) {
        arm(guide, trigger.delay, trigger.threshold);
      }
    }
  }

  function processQueue() {
    while (queue.length > 0 && !modalRun()) {
      const guide = guides.get(queue.shift() as string) as Guide;
      if (isEligible(guide)) {
        startRun(guide, {}, "visible");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard (§3)

  const next = (guideId: string): boolean => {
    const run = runOf(guideId);
    if (!run) {
      return false;
    }
    const base = run.current >= 0 ? run.current : run.target;
    if (base + 1 >= run.entries.length) {
      endRun(run, "completed");
    } else {
      request(run, base + 1, "forward");
    }
    return true;
  };

  const prev = (guideId: string): boolean => {
    const run = runOf(guideId);
    if (!run) {
      return false;
    }
    const base = run.current >= 0 ? run.current : run.target;
    if (base <= 0) {
      return false;
    }
    request(run, base - 1, "backward");
    return true;
  };

  const end = (
    guideId: string,
    reason: "completed" | "dismissed" = "dismissed"
  ): boolean => {
    const run = runOf(guideId);
    if (!run) {
      return false;
    }
    if (reason === "dismissed" && !run.snapshot?.dismissible) {
      warn(`end("${guideId}", "dismissed") refused: not dismissible.`);
      return false;
    }
    endRun(run, reason);
    return true;
  };

  function onKey({ key, target }: KeyIntent): boolean {
    const modal = modalRun();
    if (modal) {
      const { id } = modal.guide;
      if (key === "Escape") {
        return end(id);
      }
      if (key === "ArrowRight") {
        return next(id);
      }
      return key === "ArrowLeft" && prev(id);
    }
    if (key !== "Escape") {
      return false;
    }
    const focused = runs.find((run) => {
      const frame = frames.get(run.guide.id);
      return (
        !run.ending && frame !== undefined && driver.contains(frame, target)
      );
    });
    return focused ? end(focused.guide.id) : false;
  }

  // ---------------------------------------------------------------------------
  // Registries

  const registerAnchor = (
    stepId: string,
    element: Element,
    anchorOptions: AnchorOptions = {}
  ) => {
    const registered = anchors.get(stepId) ?? new Map<Element, AnchorOptions>();
    anchors.set(stepId, registered);
    registered.set(element, anchorOptions);
    onRegistryChange(stepId);
    return once(() => {
      registered.delete(element);
      if (registered.size === 0) {
        anchors.delete(stepId);
      }
      onRegistryChange(stepId);
    });
  };

  const registerContent = (stepId: string, entry: unknown) => {
    const stack = contents.get(stepId) ?? [];
    contents.set(stepId, stack);
    const slot = { entry };
    stack.push(slot);
    onRegistryChange(stepId);
    return once(() => {
      stack.splice(stack.indexOf(slot), 1);
      if (stack.length === 0) {
        contents.delete(stepId);
      }
      onRegistryChange(stepId);
    });
  };

  const registerLifecycle = (stepId: string, hooks: StepLifecycle) => {
    const list = lifecycles.get(stepId) ?? [];
    lifecycles.set(stepId, list);
    list.push(hooks);
    return once(() => {
      list.splice(list.indexOf(hooks), 1);
      if (list.length === 0) {
        lifecycles.delete(stepId);
      }
    });
  };

  const registerFrame = (guideId: string, element: Element) => {
    frames.set(guideId, element);
    return once(() => {
      if (frames.get(guideId) === element) {
        frames.delete(guideId);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Public API

  const notifyPathname = (next: string) => {
    pathname = next;
    for (const notify of [...pathnameListeners]) {
      notify();
    }
  };

  const manager: GuideManager = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLayout: (guideId) => layouts.get(guideId) ?? null,
    subscribeLayout: (guideId, listener) => {
      const set = layoutListeners.get(guideId) ?? new Set<() => void>();
      layoutListeners.set(guideId, set);
      set.add(listener);
      return () => set.delete(listener);
    },
    start: (guideId, startOptions = {}) => {
      const guide = guides.get(guideId);
      if (!guide) {
        return refuse(guideId, "unknown guide");
      }
      return startRun(guide, startOptions, "manual");
    },
    next,
    prev,
    goTo: (guideId, stepId) => {
      const run = runOf(guideId);
      const index =
        run?.entries.findIndex((entry) => entry.step.id === stepId) ?? -1;
      if (!run || index < 0) {
        return false;
      }
      request(run, index, "jump");
      return true;
    },
    end,
    resetRecord: (guideId) => {
      const guide = guides.get(guideId);
      if (!guide) {
        return;
      }
      handled.delete(guideId);
      writeRecord(guide, null);
      syncTriggers();
    },
    setRouter: (next) => {
      router = next;
      if (next) {
        notifyPathname(next.pathname);
      }
    },
    notifyPathname,
    registerAnchor,
    registerContent,
    getContent: (stepId) => contents.get(stepId)?.at(-1)?.entry,
    registerLifecycle,
    registerFrame,
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      for (const run of [...runs]) {
        endRun(run, "destroyed");
      }
      queue.length = 0;
      for (const guideId of [...watchers.keys()]) {
        disarm(guideId);
      }
      unsubscribeStorage();
    },
  };

  const unsubscribeStorage =
    storage.subscribe?.(() => {
      hydrate();
    }) ?? noop;
  hydrate();

  return manager;
};
