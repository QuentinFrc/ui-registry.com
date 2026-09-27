import {
  type ComponentType,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { warn } from "../dev.js";
import type { GuideState, GuideStep, Hook, StepLifecycle } from "../types.js";
import {
  type ActiveRun,
  contentRegistry,
  createContentSlot,
  createGuideContext,
  useGuideRoot,
  useGuideState,
} from "./store.js";
import type {
  GuideAnchor,
  GuideContext,
  GuideRender,
  UseGuideAnchorOptions,
  WithGuideContext,
} from "./types.js";

const PHASES = [
  "beforeLeave",
  "beforeEnter",
  "afterLeave",
  "afterEnter",
] as const satisfies readonly (keyof StepLifecycle)[];

const noOutlet = (): null => null;

interface PortalContentProps {
  content: ComponentType<WithGuideContext> | undefined;
  ctx: GuideContext;
  mounted: RefObject<boolean>;
  render: GuideRender | undefined;
}

/** Content rendered in the anchor's tree, portaled into the Frame outlet. */
const PortalContent = ({
  content: Content,
  ctx,
  mounted,
  render,
}: PortalContentProps) => {
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, [mounted]);
  if (Content) {
    return <Content ctx={ctx} />;
  }
  return (render as GuideRender)(ctx);
};

/**
 * Anchors a step on elements of this component and gives it its content.
 *
 * - `ref`: callback ref with cleanup, can be set on several elements.
 * - `content` is rendered (`<Content ctx={ctx} />`); `render` is called
 *   (`render(ctx)`), its latest version reaching the Frame while the step is
 *   active.
 * - `portal: true`: the content is rendered here (local providers) and
 *   portaled into the Frame's outlet; `portal` is `null` off the active step.
 * - `lifecycle`: local hooks, `enabled: false`: nothing is registered.
 */
export const useGuideAnchor = (
  step: GuideStep,
  options: UseGuideAnchorOptions = {}
): GuideAnchor => {
  const { manager, idPrefix } = useGuideRoot("useGuideAnchor");
  const {
    content,
    render,
    lifecycle,
    portal = false,
    enabled = true,
  } = options;
  const stepId = step.id;
  const hasContent = content !== undefined || render !== undefined;
  const [slot] = useState(createContentSlot);

  const selectActive = useCallback(
    (state: GuideState) =>
      (state.runs.find(
        (run) => run.status === "active" && run.step?.id === stepId
      ) as ActiveRun | undefined) ?? null,
    [stepId]
  );
  const run = useGuideState(manager, selectActive);
  const active = run !== null;

  // Latest content: always kept, the Frame is notified only while active.
  useLayoutEffect(() => {
    if (
      active &&
      content !== undefined &&
      slot.content !== undefined &&
      content !== slot.content
    ) {
      warn(
        `useGuideAnchor("${stepId}"): \`content\` changed identity while the step is active (remount). Define it outside of the component, or use \`render\`.`
      );
    }
    const changed =
      slot.content !== content ||
      slot.render !== render ||
      slot.portal !== portal;
    slot.content = content;
    slot.render = render;
    slot.portal = portal;
    if (active && changed) {
      slot.notify();
    }
  });

  useLayoutEffect(() => {
    if (!(enabled && hasContent)) {
      return;
    }
    const registry = contentRegistry(manager);
    const unregister = manager.registerContent(stepId, slot);
    registry.emit();
    return () => {
      unregister();
      registry.emit();
    };
  }, [manager, stepId, enabled, hasContent, slot]);

  // Local lifecycle: stable registration, latest hooks called.
  const latestLifecycle = useRef(lifecycle);
  useLayoutEffect(() => {
    latestLifecycle.current = lifecycle;
  });
  const phases = PHASES.filter((phase) => lifecycle?.[phase]).join(",");
  useLayoutEffect(() => {
    if (!(enabled && phases)) {
      return;
    }
    const hooks: StepLifecycle = {};
    for (const phase of phases.split(",") as (keyof StepLifecycle)[]) {
      const hook: Hook = (ctx) => latestLifecycle.current?.[phase]?.(ctx);
      hooks[phase] = hook;
    }
    return manager.registerLifecycle(stepId, hooks);
  }, [manager, stepId, enabled, phases]);

  const ref = useCallback(
    (element: Element | null) => {
      if (!(element && enabled)) {
        return;
      }
      return manager.registerAnchor(stepId, element, { content: hasContent });
    },
    [manager, stepId, enabled, hasContent]
  );

  // Portal mode.
  const outlet = useSyncExternalStore(slot.subscribe, slot.getOutlet, noOutlet);
  const ctx = useMemo(
    () => (run ? createGuideContext(manager, run, idPrefix) : null),
    [manager, run, idPrefix]
  );
  const mounted = useRef(false);
  const portalNode =
    portal && enabled && hasContent && ctx && outlet
      ? createPortal(
          <PortalContent
            content={content}
            ctx={ctx}
            mounted={mounted}
            render={render}
          />,
          outlet
        )
      : null;
  const expectsPortal = portalNode !== null;

  useEffect(() => {
    // The portal's own layout effect ran first when it is rendered.
    if (expectsPortal && !mounted.current) {
      warn(
        `useGuideAnchor("${stepId}", { portal: true }): the returned \`portal\` is not rendered while the step is active. Render it in the component: \`{portal}\`.`
      );
    }
  }, [expectsPortal, stepId]);

  return { ref, portal: portalNode };
};
