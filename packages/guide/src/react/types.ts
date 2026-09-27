/**
 * Public types of `@ui-registry/guide/react`. Type-only module.
 */
import type {
  ComponentType,
  CSSProperties,
  ReactNode,
  RefCallback,
} from "react";
import type {
  Align,
  Guide,
  GuideManager,
  GuideMode,
  GuideRouter,
  GuideRun,
  GuideState,
  GuideStep,
  Rect,
  Side,
  StepLifecycle,
} from "../types.js";

/** What a step's content receives: the run, its position and its controls. */
export interface GuideContext {
  dismissible: boolean;
  /** Ends the run; `"dismissed"` by default (refused when not dismissible). */
  end(reason?: "completed" | "dismissed"): void;
  guide: Guide;
  /** For `aria-labelledby` / `aria-describedby` (the Frame points at them). */
  ids: { title: string; description: string };
  index: number;
  isFirst: boolean;
  isLast: boolean;
  mode: GuideMode;
  next(): void;
  prev(): void;
  step: GuideStep;
  total: number;
}

/** Props of a content component: `P` plus the guide context. */
export type WithGuideContext<P = object> = P & { ctx: GuideContext };

/** Called by the lib with the context: sees the closure, no remount, no hook. */
export type GuideRender = (ctx: GuideContext) => ReactNode;

type ContentOptions =
  | {
      /** Rendered (`<Content ctx={ctx} />`): own hooks and state; keep its identity stable. */
      content: ComponentType<WithGuideContext>;
      render?: never;
    }
  | {
      /** Called (`render(ctx)`); the latest version is used. */
      render: GuideRender;
      content?: never;
    }
  | { content?: never; render?: never };

export type UseGuideAnchorOptions = ContentOptions & {
  /** Default `true`; `false` registers no anchor, no content, no lifecycle. */
  enabled?: boolean;
  /** Local hooks (§7 steps 2, 6, 9). */
  lifecycle?: StepLifecycle;
  /**
   * Default `false`. `true` renders the content in this component's tree
   * (local providers) and portals it into the Frame's outlet.
   */
  portal?: boolean;
};

export interface GuideAnchor {
  /**
   * `null` unless `portal: true` and the step is active: render it in the
   * component (`{portal}`).
   */
  portal: ReactNode;
  /** Callback ref with cleanup; can be set on several elements. */
  ref: RefCallback<Element>;
}

export interface GuideRootProps {
  children?: ReactNode;
  manager: GuideManager;
  /** Pushed into the manager (`setRouter`), with its pathname. */
  router?: GuideRouter | null;
}

export interface GuideActions {
  end: GuideManager["end"];
  goTo: GuideManager["goTo"];
  next: GuideManager["next"];
  prev: GuideManager["prev"];
  resetRecord: GuideManager["resetRecord"];
  start: GuideManager["start"];
}

export type UseGuideResult<T = GuideState> = GuideActions & { state: T };

export interface FrameFloatingProps {
  "aria-describedby": string;
  "aria-labelledby": string;
  /** `true` in modal. */
  "aria-modal": boolean;
  /** Effective side (after the placement's fallbacks). */
  "data-align": Align;
  "data-mode": GuideMode;
  "data-side": Side;
  ref: RefCallback<HTMLElement>;
  role: "dialog";
  /** `position: fixed`, `top` / `left`, hidden until placed. */
  style: CSSProperties;
  tabIndex: -1;
}

export type FrameContext = GuideContext & {
  /** Outlet of the active step's content. */
  Content: ComponentType;
  floatingProps: FrameFloatingProps;
  /** `false` during the first measure. */
  placed: boolean;
  /**
   * Rects of the step's targets (viewport coordinates, zero-sized ones
   * filtered), followed while the run is active: to draw on the target
   * itself, like a hint's beacon. Empty before the first measure.
   */
  rects: Rect[];
  run: GuideRun;
};

export interface GuideFrameProps {
  children: (frame: FrameContext) => ReactNode;
  /** Portal target of the Frames. Default: rendered in place. */
  container?: Element | DocumentFragment | null;
  /** Which runs get a Frame. Default: every one (active, not suspended). */
  select?: (run: GuideRun) => boolean;
}

export interface GuideSpotlight {
  /** A modal run exists (the veil stays during its transitions). */
  active: boolean;
  /** CSS `clip-path` of the veil; `"none"` (full veil) without targets. */
  clipPath: string;
  /** Targets of the modal run's active step. */
  rects: Rect[];
  /** The modal run, or `null`. */
  run: GuideRun | null;
}
