/**
 * Public types of `@ui-registry/guide` (vanilla entry). Type-only module.
 */

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";
export type GuideMode = "modal" | "passive";
export type Direction = "forward" | "backward" | "jump";
export type MissingAction = "skip" | "end";

export interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface Size {
  height: number;
  width: number;
}

/**
 * Fallback target of a step, used when no anchor is registered for it:
 * - a CSS selector, or several selectors,
 * - a function returning the element(s) (or `null`),
 * - `null`: no fallback, anchors only.
 */
export type StepTarget =
  | string
  | readonly string[]
  | (() => Element | readonly Element[] | null | undefined)
  | null;

export interface GuideStepOptions {
  /** Default `"center"`. */
  align?: Align;
  /** Unique per manager. */
  id: string;
  /** Default `"bottom"`. */
  side?: Side;
  /** Default: the manager's. */
  sideOffset?: number;
  /** Default: the manager's. */
  spotlightPadding?: number;
  /** Fallback target when no anchor is registered. Default `null`. */
  target?: StepTarget;
}

export type GuideStep = Readonly<{
  id: string;
  side: Side;
  align: Align;
  sideOffset: number | undefined;
  spotlightPadding: number | undefined;
  target: StepTarget;
}>;

export interface WhenContext {
  guide: Guide;
  manager: GuideManager;
  pathname: string;
}

export interface HookContext {
  direction: Direction;
  from: GuideStep | null;
  guide: Guide;
  manager: GuideManager;
  /** Resolves once the pathname matches `path`. */
  navigate: (path: string) => Promise<void>;
  pathname: string;
  /** Aborted by `end()`, a newer transition of the same run, or the hook timeout. */
  signal: AbortSignal;
  to: GuideStep;
  /** Resolves `true` when the step (or selector) has a non-empty target, `false` on timeout. */
  waitFor: (target: GuideStep | string, timeout?: number) => Promise<boolean>;
}

export type Hook = (ctx: HookContext) => void | Promise<void>;

export interface StepLifecycle {
  afterEnter?: Hook;
  afterLeave?: Hook;
  beforeEnter?: Hook;
  beforeLeave?: Hook;
}

export type GuideRoute = string | ((pathname: string) => boolean);

export type GuideEntry = StepLifecycle & {
  step: GuideStep;
  /** Declarative, idempotent. A string is compared to the exact pathname. */
  route?: GuideRoute;
  /** Evaluated at start: the total stays stable during the run. */
  when?: (ctx: WhenContext) => boolean;
  onMissing?: MissingAction;
  waitTimeout?: number;
  hookTimeout?: number;
  dismissible?: boolean;
  side?: Side;
  align?: Align;
};

export type ErrorAction = "end" | "skip" | "retry" | "stay";

export type ErrorPhase =
  | "beforeLeave"
  | "beforeEnter"
  | "afterEnter"
  | "afterLeave"
  | "route"
  | "storage"
  | "timeout";

export type EventErrorPhase = ErrorPhase | "cleanup";

export interface OnErrorContext {
  attempt: number;
  direction: Direction;
  entry: GuideEntry | null;
  error: unknown;
  guide: Guide;
  manager: GuideManager;
  phase: ErrorPhase;
  step: GuideStep | null;
}

export type OnError = (
  ctx: OnErrorContext
) => ErrorAction | Promise<ErrorAction>;

export type GuideTrigger =
  | "manual"
  | "visible"
  | { on: "visible"; delay?: number; threshold?: number };

export type ResolvedTrigger =
  | { on: "manual" }
  | { on: "visible"; delay: number; threshold: number };

export interface GuideOptions {
  dismissible?: boolean;
  hookTimeout?: number;
  id: string;
  /** Default `"modal"`. */
  mode?: GuideMode;
  onError?: OnError;
  onMissing?: MissingAction;
  steps: readonly (GuideStep | GuideEntry)[];
  /** Default `"manual"`. */
  trigger?: GuideTrigger;
  /** Default 1. Bumping it ignores older records. */
  version?: number;
  waitTimeout?: number;
  /** Eligibility (trigger and start). Default: always true. */
  when?: (ctx: WhenContext) => boolean;
}

export type Guide = Readonly<{
  id: string;
  version: number;
  mode: GuideMode;
  trigger: ResolvedTrigger;
  when: ((ctx: WhenContext) => boolean) | undefined;
  dismissible: boolean | undefined;
  onMissing: MissingAction | undefined;
  waitTimeout: number | undefined;
  hookTimeout: number | undefined;
  onError: OnError | undefined;
  /** Normalized entries, in declaration order. */
  steps: readonly GuideEntry[];
}>;

export type RecordStatus = "in-progress" | "completed" | "dismissed";

export interface GuideRecord {
  lastError?: { phase: string; at: number };
  status: RecordStatus;
  stepId?: string;
  updatedAt: number;
  version: number;
}

export interface GuideStorage {
  get(guideId: string): Promise<GuideRecord | null>;
  remove(guideId: string): Promise<void>;
  set(guideId: string, record: GuideRecord): Promise<void>;
  /** Cross-tab / server changes: calls `notify` so the manager re-reads. */
  subscribe?(notify: () => void): () => void;
}

export type RunStatus = "transitioning" | "active" | "suspended";

export interface GuideRun {
  /** Resolved for the current entry. */
  dismissible: boolean;
  /** Entries kept at start (after `when`). */
  entries: GuideEntry[];
  entry: GuideEntry | null;
  guide: Guide;
  /** Index in `entries`. */
  index: number;
  status: RunStatus;
  /** `null` during the first transition. */
  step: GuideStep | null;
  total: number;
}

export interface GuideState {
  /** Records have been read from the storage. */
  hydrated: boolean;
  records: Record<string, GuideRecord | null>;
  /** Start order. */
  runs: GuideRun[];
}

export interface GuideLayout {
  /** Non-empty rects of the active step's targets (viewport coordinates). */
  rects: Rect[];
  /** Placement bounds: the `collisionContainer`'s rect, or the viewport. */
  view: Rect;
  /** Size of the viewport (spotlight clamp). */
  viewport: Size;
}

/**
 * Placement options of a run's current step, resolved entry > step > manager
 * (used by `/react` to place a Frame and draw the spotlight).
 */
export interface GuidePresentation {
  align: Align;
  /** The manager's `viewportMargin`. */
  margin: number;
  placement: PlacementStrategy;
  side: Side;
  sideOffset: number;
  spotlightPadding: number;
}

export type EndReason =
  | "completed"
  | "dismissed"
  | "missing"
  | "error"
  | "replaced"
  | "destroyed";

export type StartTrigger = "manual" | "visible";

export type GuideEvent =
  | {
      type: "start";
      guideId: string;
      stepId: string;
      resumed: boolean;
      trigger: StartTrigger;
    }
  | {
      type: "step";
      guideId: string;
      stepId: string;
      index: number;
      from: string | null;
      direction: Direction;
    }
  | { type: "missing"; guideId: string; stepId: string; action: MissingAction }
  | { type: "suspend" | "resume"; guideId: string }
  | {
      type: "end";
      guideId: string;
      stepId: string | null;
      reason: EndReason;
    }
  | {
      type: "error";
      guideId: string;
      stepId: string | null;
      phase: EventErrorPhase;
      error: unknown;
      action?: ErrorAction;
    };

export interface GuideRouter {
  navigate: (path: string) => void | Promise<void>;
  pathname: string;
}

export type PlacementStrategy = (input: {
  targets: Rect[];
  floating: Size;
  side: Side;
  align: Align;
  sideOffset: number;
  margin: number;
  view: Rect;
  obstacles: Rect[];
}) => { x: number; y: number; side: Side; align: Align };

export interface ScrollOptions {
  /** `"auto"` respects `prefers-reduced-motion`. Default `"auto"`. */
  behavior?: "auto" | "smooth" | "instant";
  /** Default `"center"`. */
  block?: "start" | "center" | "end" | "nearest";
  /** Default `false`. */
  lock?: boolean;
}

export interface StartOptions {
  /** `"resume"` (default when the record is `in-progress`), `"start"`, or a step id. */
  from?: "resume" | "start" | (string & {});
  /** Ends the current modal run (`"replaced"`) before starting. */
  replace?: boolean;
}

export interface AnchorOptions {
  /** The anchor's step renders a content: the wait also requires `registerContent`. */
  content?: boolean;
}

export interface GuideManagerOptions {
  /** Default: the viewport. */
  collisionContainer?: () => Element | null;
  /** Default `true`. */
  dismissible?: boolean;
  guides: readonly Guide[];
  /** Default 10000 ms. */
  hookTimeout?: number;
  /** Default `true`. */
  keyboard?: boolean;
  /** Effective default: `"end"`. */
  onError?: OnError;
  onEvent?: (event: GuideEvent) => void;
  /** Default `"skip"`. */
  onMissing?: MissingAction;
  placement?: PlacementStrategy;
  scroll?: ScrollOptions;
  /** Default 16. */
  sideOffset?: number;
  /** Default 8. */
  spotlightPadding?: number;
  /** Default `localStorageAdapter()`. */
  storage?: GuideStorage;
  /** Default 20. */
  viewportMargin?: number;
  /** Default 3000 ms. */
  waitTimeout?: number;
}

export interface GuideManager {
  destroy(): void;
  end(guideId: string, reason?: "completed" | "dismissed"): boolean;
  /** Latest content registered for a step (used by `/react`). */
  getContent(stepId: string): unknown;
  getLayout(guideId: string): GuideLayout | null;
  /** Placement options of a run's current step; `null` without one. */
  getPresentation(guideId: string): GuidePresentation | null;
  getState(): GuideState;
  goTo(guideId: string, stepId: string): boolean;
  next(guideId: string): boolean;
  notifyPathname(pathname: string): void;
  prev(guideId: string): boolean;
  registerAnchor(
    stepId: string,
    element: Element,
    options?: AnchorOptions
  ): () => void;
  registerContent(stepId: string, entry: unknown): () => void;
  /** Frame element of a run (used by `/react` for keyboard focus checks). */
  registerFrame(guideId: string, element: Element): () => void;
  registerLifecycle(stepId: string, hooks: StepLifecycle): () => void;
  resetRecord(guideId: string): void;
  setRouter(router: GuideRouter | null): void;
  start(guideId: string, options?: StartOptions): boolean;
  subscribe(listener: () => void): () => void;
  subscribeLayout(guideId: string, listener: () => void): () => void;
}
