import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { warn } from "../dev.js";
import { inflateRect } from "../geometry.js";
import type { GuideRun, GuideState, Size } from "../types.js";
import {
  type ActiveRun,
  type ContentSlot,
  contentRegistry,
  createGuideContext,
  useGuideLayout,
  useGuideRoot,
  useGuideState,
} from "./store.js";
import type {
  FrameContext,
  GuideContext,
  GuideFrameProps,
  GuideRender,
} from "./types.js";

const FrameContentContext = createContext<GuideContext | null>(null);

const selectRuns = (state: GuideState): GuideRun[] => state.runs;

const isShown = (run: GuideRun): run is ActiveRun =>
  run.status === "active" && run.step !== null;

/** Portal target of a content rendered by its anchor (`portal: true`). */
const PortalOutlet = ({ slot }: { slot: ContentSlot }) => {
  const ref = useCallback(
    (node: HTMLDivElement | null) => (node ? slot.setOutlet(node) : undefined),
    [slot]
  );
  return <div data-guide-outlet="" ref={ref} style={{ display: "contents" }} />;
};

const SlotContent = ({
  slot,
  ctx,
}: {
  slot: ContentSlot;
  ctx: GuideContext;
}) => {
  // Re-renders with the latest `content` / `render` of the anchor.
  useSyncExternalStore(slot.subscribe, slot.getVersion, slot.getVersion);
  if (slot.portal) {
    return <PortalOutlet slot={slot} />;
  }
  const { content: Content } = slot;
  if (Content) {
    return <Content ctx={ctx} />;
  }
  return (slot.render as GuideRender)(ctx);
};

/** `frame.Content`: outlet of the active step's content. */
const FrameContent = () => {
  const ctx = use(FrameContentContext);
  if (!ctx) {
    throw new Error("frame.Content must be rendered within <GuideFrame>.");
  }
  const { manager } = useGuideRoot("frame.Content");
  const stepId = ctx.step.id;
  const registry = contentRegistry(manager);
  const getSlot = useCallback(
    () => manager.getContent(stepId) as ContentSlot | undefined,
    [manager, stepId]
  );
  const slot = useSyncExternalStore(registry.subscribe, getSlot, getSlot);
  const missing = slot === undefined;
  useEffect(() => {
    if (missing) {
      warn(
        `Step "${stepId}" is active without content: pass \`content\` or \`render\` to useGuideAnchor().`
      );
    }
  }, [missing, stepId]);
  return slot ? <SlotContent ctx={ctx} slot={slot} /> : null;
};

const sameSize = (a: Size | null, b: Size): boolean =>
  a !== null && a.width === b.width && a.height === b.height;

interface FrameItemProps {
  children: (frame: FrameContext) => ReactNode;
  run: ActiveRun;
}

const FrameItem = ({ run, children }: FrameItemProps) => {
  const { manager, idPrefix } = useGuideRoot("GuideFrame");
  const guideId = run.guide.id;
  const stepId = run.step.id;
  const modal = run.guide.mode === "modal";
  const layout = useGuideLayout(manager, guideId);
  const [floating, setFloating] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<Size | null>(null);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element) {
        return;
      }
      setFloating(element);
      const unregister = manager.registerFrame(guideId, element);
      return () => {
        unregister();
        setFloating((current) => (current === element ? null : current));
      };
    },
    [manager, guideId]
  );

  // Size of the floating element: measured once, then on resize.
  useLayoutEffect(() => {
    if (!floating) {
      return;
    }
    const measure = () => {
      // Layout size: a transform (an entry animation scaling the Frame in)
      // does not shrink it, as it would with `getBoundingClientRect`.
      const next = {
        width: floating.offsetWidth,
        height: floating.offsetHeight,
      };
      setSize((current) => (sameSize(current, next) ? current : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(floating);
    return () => observer.disconnect();
  }, [floating]);

  const presentation = manager.getPresentation(guideId);
  const position =
    layout && size && presentation
      ? presentation.placement({
          targets: layout.rects,
          floating: size,
          side: presentation.side,
          align: presentation.align,
          sideOffset: presentation.sideOffset,
          margin: presentation.margin,
          view: layout.view,
          // Modal: the padded spotlights stay uncovered.
          obstacles: modal
            ? layout.rects.map((rect) =>
                inflateRect(rect, presentation.spotlightPadding)
              )
            : [],
        })
      : null;
  const placed = position !== null;

  // Modal: the Frame takes the focus on each active step (the manager
  // restores it at the end of the run). Passive: never.
  useEffect(() => {
    if (modal && placed && floating && stepId) {
      floating.focus({ preventScroll: true });
    }
  }, [modal, placed, floating, stepId]);

  const ctx = useMemo(
    () => createGuideContext(manager, run, idPrefix),
    [manager, run, idPrefix]
  );
  const frame: FrameContext = {
    ...ctx,
    run,
    Content: FrameContent,
    placed,
    floatingProps: {
      ref,
      style: {
        position: "fixed",
        top: position?.y ?? 0,
        left: position?.x ?? 0,
        ...(placed ? {} : { visibility: "hidden" }),
      },
      role: "dialog",
      "aria-modal": modal,
      "aria-labelledby": ctx.ids.title,
      "aria-describedby": ctx.ids.description,
      "data-side": position?.side ?? presentation?.side ?? run.step.side,
      "data-align": position?.align ?? presentation?.align ?? run.step.align,
      "data-mode": run.guide.mode,
      tabIndex: -1,
    },
  };
  return (
    <FrameContentContext value={ctx}>{children(frame)}</FrameContentContext>
  );
};

/**
 * Headless Frame: renders `children(frame)` for each selected run (active,
 * not suspended; `select` narrows them). Position, aria and data attributes
 * are in `frame.floatingProps`, the step's content in `<frame.Content />`.
 */
export const GuideFrame = ({
  children,
  container,
  select,
}: GuideFrameProps) => {
  const { manager } = useGuideRoot("GuideFrame");
  const runs = useGuideState(manager, selectRuns);
  const frames = runs
    .filter((run) => isShown(run) && (select ? select(run) : true))
    .map((run) => (
      <FrameItem key={run.guide.id} run={run as ActiveRun}>
        {children}
      </FrameItem>
    ));
  return container ? createPortal(frames, container) : frames;
};
