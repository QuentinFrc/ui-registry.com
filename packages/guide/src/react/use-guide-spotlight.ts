import { useMemo } from "react";
import { spotlightPath } from "../spotlight.js";
import type { GuideRun, GuideState, Rect } from "../types.js";
import { useGuideLayout, useGuideRoot, useGuideState } from "./store.js";
import type { GuideSpotlight } from "./types.js";

const NO_RECTS: Rect[] = [];

/**
 * The latest modal run: a modal run still ending (slow cleanup hooks) stays
 * listed before the one that replaced it, which is the one the veil follows.
 */
const selectModalRun = (state: GuideState): GuideRun | null => {
  for (let index = state.runs.length - 1; index >= 0; index -= 1) {
    const run = state.runs[index] as GuideRun;
    if (run.guide.mode === "modal") {
      return run;
    }
  }
  return null;
};

/**
 * Veil of the modal run: `active` while it exists (transitions included),
 * `clipPath` with one hole per target of its active step (`"none"`, a full
 * veil, without targets).
 */
export const useGuideSpotlight = (): GuideSpotlight => {
  const { manager } = useGuideRoot("useGuideSpotlight");
  const run = useGuideState(manager, selectModalRun);
  const guideId = run?.guide.id ?? null;
  const layout = useGuideLayout(manager, guideId);
  const padding =
    guideId === null
      ? undefined
      : manager.getPresentation(guideId)?.spotlightPadding;
  return useMemo(
    () => ({
      active: run !== null,
      clipPath:
        layout && padding !== undefined
          ? spotlightPath(layout.rects, padding, layout.viewport)
          : "none",
      rects: layout?.rects ?? NO_RECTS,
      run,
    }),
    [run, layout, padding]
  );
};
