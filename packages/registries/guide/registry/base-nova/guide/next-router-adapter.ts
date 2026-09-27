import type { GuideRouter } from "@ui-registry/guide";

/** The part of Next's `AppRouterInstance` (`useRouter()`) the adapter uses. */
export interface NextAppRouter {
  push(href: string): void;
}

export interface NextRouterAdapterOptions {
  /** `usePathname()`. */
  pathname: string;
  /** `useRouter()` from `next/navigation`. */
  router: NextAppRouter;
}

/**
 * Connects the guide manager to the Next.js App Router:
 *
 * ```tsx
 * <GuideRoot
 *   manager={guides}
 *   router={nextRouterAdapter({ router: useRouter(), pathname: usePathname() })}
 * >
 * ```
 *
 * `navigate` pushes the route; the manager waits until `pathname` matches.
 */
export const nextRouterAdapter = ({
  router,
  pathname,
}: NextRouterAdapterOptions): GuideRouter => ({
  navigate: (path) => router.push(path),
  pathname,
});
