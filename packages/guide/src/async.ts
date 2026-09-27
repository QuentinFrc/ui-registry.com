/** A hook, `onError` or a wait exceeded its time budget. */
export class GuideTimeoutError extends Error {
  readonly timeout: number;

  constructor(timeout: number) {
    super(`Timed out after ${timeout} ms.`);
    this.name = "GuideTimeoutError";
    this.timeout = timeout;
  }
}

/** Calls `fn` synchronously; a synchronous throw becomes a rejection. */
export const callAsync = <T>(fn: () => T | PromiseLike<T>): Promise<T> =>
  new Promise<T>((resolve) => resolve(fn()));

/** Settles like `promise`, or rejects with the signal's reason when it aborts first. */
export const withAbort = <T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });

/**
 * Runs `task` with a signal aborted by `parent` or after `timeout` ms.
 * Rejects with a `GuideTimeoutError` on timeout, the parent's reason on abort.
 */
export const runBounded = <T>(
  task: (signal: AbortSignal) => T | PromiseLike<T>,
  timeout: number,
  parent: AbortSignal
): Promise<T> => {
  const timer = new AbortController();
  const signal = AbortSignal.any([parent, timer.signal]);
  const handle = setTimeout(
    () => timer.abort(new GuideTimeoutError(timeout)),
    timeout
  );
  return withAbort(
    callAsync(() => task(signal)),
    signal
  ).finally(() => clearTimeout(handle));
};

/**
 * Resolves `true` as soon as `check()` passes (re-checked on each
 * notification of `subscribe`), `false` after `timeout` ms. Rejects when the
 * signal aborts.
 */
export const waitUntil = (
  check: () => boolean,
  subscribe: (notify: () => void) => () => void,
  timeout: number,
  signal: AbortSignal
): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    signal.throwIfAborted();
    if (check()) {
      resolve(true);
      return;
    }
    const settle = (finish: () => void) => {
      clearTimeout(handle);
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
      finish();
    };
    const onAbort = () => settle(() => reject(signal.reason));
    const unsubscribe = subscribe(() => {
      if (check()) {
        settle(() => resolve(true));
      }
    });
    const handle = setTimeout(() => settle(() => resolve(false)), timeout);
    signal.addEventListener("abort", onAbort, { once: true });
  });
