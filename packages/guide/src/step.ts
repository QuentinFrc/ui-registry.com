import { warn } from "./dev.js";
import type { GuideStep, GuideStepOptions, StepTarget } from "./types.js";

const freezeTarget = (target: StepTarget | undefined): StepTarget => {
  if (target === undefined || target === null) {
    return null;
  }
  if (Array.isArray(target)) {
    return Object.freeze([...target]);
  }
  return target as StepTarget;
};

/**
 * Declares an anchored point of the UI: a target and placement defaults.
 * Pure data, shareable between guides, without any rendering concern.
 */
export const createGuideStep = (options: GuideStepOptions): GuideStep => {
  if (typeof options.id !== "string" || options.id.length === 0) {
    throw new Error("createGuideStep: `id` must be a non-empty string.");
  }
  return Object.freeze({
    id: options.id,
    side: options.side ?? "bottom",
    align: options.align ?? "center",
    sideOffset: options.sideOffset,
    spotlightPadding: options.spotlightPadding,
    target: freezeTarget(options.target),
  });
};

const querySafe = (
  selector: string,
  query: (selector: string) => readonly Element[]
): Element[] => {
  try {
    return [...query(selector)];
  } catch (error) {
    warn(`Invalid selector "${selector}": resolved to no target.`, error);
    return [];
  }
};

/**
 * Resolves a step `target` to elements. Never throws: an invalid selector or
 * a throwing function resolves to no target (dev warning).
 *
 * @internal
 */
export const resolveStepTarget = (
  target: StepTarget,
  query: (selector: string) => readonly Element[]
): Element[] => {
  if (target === null) {
    return [];
  }
  if (typeof target === "string") {
    return querySafe(target, query);
  }
  if (typeof target === "function") {
    let resolved: Element | readonly Element[] | null | undefined;
    try {
      resolved = target();
    } catch (error) {
      warn("Step target function threw: resolved to no target.", error);
      return [];
    }
    if (resolved === null || resolved === undefined) {
      return [];
    }
    return Array.isArray(resolved)
      ? [...(resolved as readonly Element[])]
      : [resolved as Element];
  }
  return target.flatMap((selector) => querySafe(selector, query));
};
