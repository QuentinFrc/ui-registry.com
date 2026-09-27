"use client";

import type { GuideRun, Rect } from "@ui-registry/guide";
import {
  type FrameContext,
  GuideFrame,
  type WithGuideContext,
} from "@ui-registry/guide/react";
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefCallback,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HintLabels {
  /** Closes the hint for good (`end("dismissed")`). */
  close: string;
  /** Last step: completes the hint (`end("completed")`). */
  done: ReactNode;
  /** Other steps: goes to the next one. */
  next: ReactNode;
  /** Accessible name of the beacon. */
  open: string;
}

const DEFAULT_LABELS: HintLabels = {
  open: "Show tip",
  close: "Dismiss tip",
  next: "Next",
  done: "Got it",
};

const isPassive = (run: GuideRun) => run.guide.mode === "passive";

const area = (rect: Rect) => rect.width * rect.height;

/** The beacon sits on the largest target (a step may have several). */
const majorRect = (rects: Rect[]): Rect | null =>
  rects.reduce<Rect | null>(
    (major, rect) => (major && area(major) >= area(rect) ? major : rect),
    null
  );

export interface HintProps {
  /** Classes of the beacon (the pulsing dot). */
  beaconClassName?: string;
  /** Classes of the popover. */
  className?: string;
  /** English by default. */
  labels?: Partial<HintLabels>;
}

/**
 * Frame of the passive runs: a pulsing beacon on the step's target, which
 * opens the step's content in a popover. Never takes the focus by itself;
 * Escape while the focus is in the hint dismisses it. Mount once, inside
 * `<GuideRoot>`, next to `<TourFrame />` (hints are hidden during a tour).
 */
export function Hint({ beaconClassName, className, labels }: HintProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  return (
    <GuideFrame select={isPassive}>
      {(frame) => (
        <HintItem
          beaconClassName={beaconClassName}
          className={className}
          frame={frame}
          labels={text}
        />
      )}
    </GuideFrame>
  );
}

interface HintItemProps {
  beaconClassName?: string;
  className?: string;
  frame: FrameContext;
  labels: HintLabels;
}

function HintItem({
  beaconClassName,
  className,
  frame,
  labels,
}: HintItemProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const beaconRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { ref: floatingRef } = frame.floatingProps;
  const rect = majorRect(frame.rects);

  const ref = useCallback<RefCallback<HTMLDivElement>>(
    (node) => {
      popoverRef.current = node;
      const release = floatingRef(node);
      return () => {
        popoverRef.current = null;
        if (typeof release === "function") {
          release();
        }
      };
    },
    [floatingRef]
  );

  // Opened by the user: the focus moves into the popover once it is placed.
  useEffect(() => {
    if (open && frame.placed) {
      popoverRef.current?.focus({ preventScroll: true });
    }
  }, [open, frame.placed]);

  // A press outside the hint closes the popover (the hint stays).
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const inside =
        popoverRef.current?.contains(target) ||
        beaconRef.current?.contains(target);
      if (!inside) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // The popover is the run's Frame (Escape in it is handled by the manager);
  // the beacon is outside of it, so it relays Escape itself.
  const onBeaconKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && frame.dismissible) {
      frame.end("dismissed");
    }
  };

  if (!rect) {
    return null;
  }

  const beaconStyle: CSSProperties = {
    position: "fixed",
    top: rect.y,
    left: rect.x + rect.width,
  };

  return (
    <>
      <button
        aria-controls={open ? popoverId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={labels.open}
        className={cn(
          "group/hint z-50 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          beaconClassName
        )}
        data-slot="hint-beacon"
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onBeaconKeyDown}
        ref={beaconRef}
        style={beaconStyle}
        type="button"
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 group-data-[state=open]/hint:hidden motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
      </button>
      {open ? (
        <div
          {...frame.floatingProps}
          className={cn(
            "fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 flex w-72 max-w-[calc(100vw-2rem)] animate-in flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-popover-foreground text-sm shadow-md outline-hidden ring-1 ring-foreground/10 duration-100 motion-reduce:animate-none",
            className
          )}
          data-slot="hint-popover"
          id={popoverId}
          ref={ref}
        >
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <frame.Content />
            </div>
            {frame.dismissible ? (
              <Button
                aria-label={labels.close}
                className="-mt-1 -mr-1"
                onClick={() => frame.end("dismissed")}
                size="icon-xs"
                variant="ghost"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Button>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2">
            {frame.total > 1 ? (
              <span className="mr-auto text-muted-foreground text-xs">
                {frame.index + 1}/{frame.total}
              </span>
            ) : null}
            {frame.isLast ? (
              <Button onClick={() => frame.end("completed")} size="xs">
                {labels.done}
              </Button>
            ) : (
              <Button onClick={frame.next} size="xs">
                {labels.next}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

type HintTextProps<T extends "h2" | "p"> = WithGuideContext<
  Omit<ComponentProps<T>, "id">
>;

/** Title of a hint's content, labelling the popover (`aria-labelledby`). */
export function HintTitle({ ctx, className, ...props }: HintTextProps<"h2">) {
  return (
    <h2
      className={cn("font-medium text-sm", className)}
      data-slot="hint-title"
      id={ctx.ids.title}
      {...props}
    />
  );
}

/** Description of a hint's content, describing the popover (`aria-describedby`). */
export function HintDescription({
  ctx,
  className,
  ...props
}: HintTextProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="hint-description"
      id={ctx.ids.description}
      {...props}
    />
  );
}
