import type { GuideDriver } from "./driver.js";

const noop = (): void => undefined;

/**
 * Driver without DOM: nothing resolves, nothing is visible, nothing moves.
 * Default of the manager without `window` (server, workers).
 *
 * @internal
 */
export const createHeadlessDriver = (): GuideDriver => ({
  query: () => [],
  measure: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  viewport: () => ({ width: 0, height: 0 }),
  isInViewport: () => false,
  contains: (container, node) => container === node,
  watch: () => noop,
  scrollIntoView: () => Promise.resolve(),
  lockScroll: () => noop,
  captureFocus: () => noop,
  listenKeys: () => noop,
  track: () => noop,
  observeVisibility: () => noop,
});
