import { useId, useLayoutEffect, useMemo, useRef } from "react";
import type { GuideRouter } from "../types.js";
import { GuideRootContext, type GuideRootValue } from "./store.js";
import type { GuideRootProps } from "./types.js";

/**
 * Provides the manager to the hooks and pushes the router and its pathname
 * into it (`setRouter`, `notifyPathname`). The manager itself lives outside
 * of React: unmounting the root does not destroy it.
 */
export const GuideRoot = ({ manager, router, children }: GuideRootProps) => {
  const idPrefix = useId();
  const latest = useRef(router);
  const hasRouter = router !== undefined && router !== null;
  const pathname = router?.pathname;

  useLayoutEffect(() => {
    latest.current = router;
  });

  useLayoutEffect(() => {
    if (!hasRouter) {
      return;
    }
    // Stable proxy: adapters are usually re-created on every render.
    const proxy: GuideRouter = {
      navigate: (path) => (latest.current as GuideRouter).navigate(path),
      get pathname() {
        return (latest.current as GuideRouter).pathname;
      },
    };
    manager.setRouter(proxy);
    return () => manager.setRouter(null);
  }, [manager, hasRouter]);

  useLayoutEffect(() => {
    if (pathname !== undefined) {
      manager.notifyPathname(pathname);
    }
  }, [manager, pathname]);

  const value = useMemo<GuideRootValue>(
    () => ({ manager, idPrefix }),
    [manager, idPrefix]
  );
  return <GuideRootContext value={value}>{children}</GuideRootContext>;
};
