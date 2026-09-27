"use client";

import type { GuideRun } from "@ui-registry/guide";
import { GuideFrame, type WithGuideContext } from "@ui-registry/guide/react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TourFrameLabels {
  finish: ReactNode;
  next: ReactNode;
  previous: ReactNode;
  skip: ReactNode;
}

const DEFAULT_LABELS: TourFrameLabels = {
  skip: "Skip",
  previous: "Previous",
  next: "Next",
  finish: "Finish",
};

const defaultStepLabel = ({ current, total }: StepLabelMeta) =>
  `Step ${current} of ${total}`;

const isModal = (run: GuideRun) => run.guide.mode === "modal";

export interface StepLabelMeta {
  current: number;
  total: number;
}

export interface TourFrameProps {
  className?: string;
  /** Button labels; English by default. */
  labels?: Partial<TourFrameLabels>;
  /** "Step 1 of 3" by default; `null` hides it. */
  stepLabel?: ((meta: StepLabelMeta) => ReactNode) | null;
}

/**
 * Frame of the modal runs: the step's content, a counter and the
 * Skip / Previous / Next / Finish controls. Mount once, inside `<GuideRoot>`,
 * next to `<GuideSpotlight />`.
 */
export function TourFrame({
  className,
  labels,
  stepLabel = defaultStepLabel,
}: TourFrameProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  return (
    <GuideFrame select={isModal}>
      {(frame) => (
        <Card
          {...frame.floatingProps}
          className={cn(
            "fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-80 max-w-[calc(100vw-2rem)] animate-in pb-0 shadow-lg outline-none duration-200 motion-reduce:animate-none",
            className
          )}
          data-slot="tour-frame"
          size="sm"
        >
          <CardContent className="flex flex-col gap-2">
            {stepLabel ? (
              <p
                className="text-muted-foreground text-xs"
                data-slot="tour-frame-step"
              >
                {stepLabel({ current: frame.index + 1, total: frame.total })}
              </p>
            ) : null}
            <frame.Content />
          </CardContent>
          <CardFooter className="gap-2">
            {frame.dismissible ? (
              <Button
                onClick={() => frame.end("dismissed")}
                size="sm"
                variant="ghost"
              >
                {text.skip}
              </Button>
            ) : null}
            <div className="ml-auto flex gap-2">
              {frame.isFirst ? null : (
                <Button onClick={frame.prev} size="sm" variant="outline">
                  {text.previous}
                </Button>
              )}
              {frame.isLast ? (
                <Button onClick={() => frame.end("completed")} size="sm">
                  {text.finish}
                </Button>
              ) : (
                <Button onClick={frame.next} size="sm">
                  {text.next}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      )}
    </GuideFrame>
  );
}

type TourTextProps<T extends "h2" | "p"> = WithGuideContext<
  Omit<ComponentProps<T>, "id">
>;

/** Title of a step's content, labelling the Frame (`aria-labelledby`). */
export function TourTitle({ ctx, className, ...props }: TourTextProps<"h2">) {
  return (
    <h2
      className={cn("font-medium text-base leading-snug", className)}
      data-slot="tour-title"
      id={ctx.ids.title}
      {...props}
    />
  );
}

/** Description of a step's content, describing the Frame (`aria-describedby`). */
export function TourDescription({
  ctx,
  className,
  ...props
}: TourTextProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="tour-description"
      id={ctx.ids.description}
      {...props}
    />
  );
}
