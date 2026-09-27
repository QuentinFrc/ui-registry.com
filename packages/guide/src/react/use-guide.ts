import { useCallback, useMemo } from "react";
import type { GuideRun, GuideState } from "../types.js";
import { useGuideRoot, useGuideState } from "./store.js";
import type { GuideActions, UseGuideResult } from "./types.js";

const identity = (state: GuideState): GuideState => state;

/**
 * The manager's state (or a slice of it, with `selector`) and its actions.
 * Re-renders when the selected value changes (`Object.is`).
 */
export function useGuide(): UseGuideResult<GuideState>;
export function useGuide<T>(
  selector: (state: GuideState) => T
): UseGuideResult<T>;
export function useGuide<T>(
  selector?: (state: GuideState) => T
): UseGuideResult<T | GuideState> {
  const { manager } = useGuideRoot("useGuide");
  const state = useGuideState<T | GuideState>(manager, selector ?? identity);
  const actions = useMemo<GuideActions>(
    () => ({
      start: (guideId, options) => manager.start(guideId, options),
      next: (guideId) => manager.next(guideId),
      prev: (guideId) => manager.prev(guideId),
      goTo: (guideId, stepId) => manager.goTo(guideId, stepId),
      end: (guideId, reason) => manager.end(guideId, reason),
      resetRecord: (guideId) => manager.resetRecord(guideId),
    }),
    [manager]
  );
  return useMemo(() => ({ ...actions, state }), [actions, state]);
}

/** The run of a guide, or `null`. */
export const useGuideRun = (guideId: string): GuideRun | null => {
  const { manager } = useGuideRoot("useGuideRun");
  const selector = useCallback(
    (state: GuideState) =>
      state.runs.find((run) => run.guide.id === guideId) ?? null,
    [guideId]
  );
  return useGuideState(manager, selector);
};
