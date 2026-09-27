"use client";

import { useGuide, useGuideSpotlight } from "@ui-registry/guide/react";
import { cn } from "@/lib/utils";

const selectNothing = () => null;

export interface GuideSpotlightProps {
  className?: string;
  /** Clicking the veil dismisses the run (when it is dismissible). Default `true`. */
  closeOnClick?: boolean;
}

/**
 * Veil of the modal run: full while it moves between steps, with one hole
 * per target once a step is active. The veil blocks every click but the
 * holes, so the targets stay usable. Mount once, inside `<GuideRoot>`.
 */
export function GuideSpotlight({
  className,
  closeOnClick = true,
}: GuideSpotlightProps) {
  const { active, clipPath, run } = useGuideSpotlight();
  const { end } = useGuide(selectNothing);

  if (!(active && run)) {
    return null;
  }

  const dismiss = () => {
    if (closeOnClick && run.dismissible) {
      end(run.guide.id, "dismissed");
    }
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fade-in-0 fixed inset-0 z-40 animate-in bg-black/50 transition-[clip-path] duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none",
        className
      )}
      data-slot="guide-spotlight"
      data-status={run.status}
      onClick={dismiss}
      style={{ clipPath }}
    />
  );
}
