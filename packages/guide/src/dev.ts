const PREFIX = "[@ui-registry/guide]";

/** Development build (bundlers replace `process.env.NODE_ENV`). */
export const isDev = (): boolean =>
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

/** Dev-only warning. Silent in production. */
export const warn = (message: string, ...details: unknown[]): void => {
  if (isDev()) {
    console.warn(`${PREFIX} ${message}`, ...details);
  }
};
