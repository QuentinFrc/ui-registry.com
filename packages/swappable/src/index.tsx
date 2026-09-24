/**
 * @ui-registry/swappable — swap component implementations by variant.
 *
 * Two-step factory: describe the mechanics first (variants, fallback, how the
 * current variant is resolved), then the slots (one implementation per
 * variant). Slot props are inferred from the fallback implementation.
 *
 * ```tsx
 * const Layout = createSwappable({
 *   name: "Layout",
 *   variants: ["mobile", "desktop"],
 *   fallback: "desktop",
 *   useVariant: ({ initial }: { initial: "mobile" | "desktop" }) => ...,
 * })({
 *   Header: { mobile: HeaderMobile, desktop: HeaderDesktop },
 *   Sidebar: { mobile: null, desktop: Sidebar },
 * });
 *
 * <Layout.Provider initial="desktop">
 *   <Layout.Header title="Hi" />
 *   <Layout.Sidebar.desktop items={items} />
 *   <Layout.Match variant="mobile"><BottomBar /></Layout.Match>
 * </Layout.Provider>
 * ```
 */

import {
  type ComponentType,
  createContext,
  type FC,
  type ReactNode,
  useContext,
} from "react";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A slot implementation. `null` means "render nothing for this variant". */
export type Implementation<P = never> = ComponentType<P> | null;

/** Props injected into every implementation. Caller props win on collision. */
export type VariantProps<V extends string> = (ctx: {
  variant: V;
}) => Record<string, unknown>;

export interface SwappableConfig<
  V extends readonly string[],
  F extends V[number],
  Args,
> {
  /**
   * Variant whose implementation is used when a slot has none for the current
   * variant. Its implementation also defines the slot's props contract.
   */
  fallback: F;
  /** Used for displayNames and error messages. */
  name?: string;
  /**
   * Hook called inside `Provider` to resolve the current variant. Receives the
   * Provider props. Must follow the rules of hooks. Must return one of
   * `variants` (checked at runtime).
   */
  useVariant: (args: Args) => V[number];
  /**
   * Props injected into every implementation, also exposed via
   * `useVariantProps` for hand-written components. Defaults to
   * `{ "data-variant": variant }`.
   */
  variantProps?: VariantProps<V[number]>;
  /** Exhaustive list of variants. Keys of every slot map must be in this list. */
  variants: V;
}

type PropsOf<T> = T extends ComponentType<infer P> ? P : never;

type NonNullImplementations<M> = Exclude<M[keyof M], null | undefined>;

/**
 * The props contract of a slot: props of the fallback implementation when it
 * is a component, otherwise the props of the remaining implementations.
 */
export type SlotContract<M, F extends PropertyKey> = F extends keyof M
  ? M[F] extends ComponentType<infer P>
    ? P
    : PropsOf<NonNullImplementations<M>>
  : PropsOf<NonNullImplementations<M>>;

/**
 * Validates a slots map: every key must be a known variant and every
 * implementation must accept the slot contract.
 */
export type ValidSlots<V extends string, F extends V, S> = {
  [K in keyof S]: {
    [Key in keyof S[K]]: Key extends V
      ? S[K][Key] extends null
        ? null
        : ComponentType<SlotContract<S[K], F>>
      : `Unknown variant "${Key & string}"`;
  };
};

interface MatchProps<V extends string> {
  children: ReactNode;
  /** Render children only when the current variant is (one of) these. */
  variant: V | readonly V[];
}

/** A built slot: a component plus one sub-component per variant. */
export type SlotComponent<V extends string, P> = FC<P> & {
  [Variant in V]: FC<P>;
};

// When `useVariant` takes no argument, `Args` infers as `unknown`.
type ProviderArgs<Args> = unknown extends Args ? Record<never, never> : Args;

export type Swappable<V extends string, F extends V, Args, S> = {
  /** Resolves the variant via `useVariant` and provides it to descendants. */
  Provider: FC<ProviderArgs<Args> & { children?: ReactNode }>;
  /** Renders children only for the given variant(s). */
  Match: FC<MatchProps<V>>;
  /** Current variant. Throws outside `Provider`. */
  useVariant: () => V;
  /** Props from `variantProps` for the current variant. */
  useVariantProps: () => Record<string, unknown>;
  /** The variants and fallback this swappable was created with. */
  variants: readonly V[];
  fallback: F;
} & {
  [K in keyof S]: SlotComponent<V, SlotContract<S[K], F>>;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const RESERVED_KEYS = new Set([
  "Provider",
  "Match",
  "useVariant",
  "useVariantProps",
  "variants",
  "fallback",
]);

const defaultVariantProps = <V extends string>({
  variant,
}: {
  variant: V;
}): Record<string, unknown> => ({ "data-variant": variant });

type SlotMap<V extends string> = Partial<
  Record<V, ComponentType<Record<string, unknown>> | null>
>;

/**
 * Identity helper that preserves literal types, for configs shared across
 * several swappables: `createSwappable({ ...responsive, name: "Layout" })`.
 */
export const defineConfig = <
  const V extends readonly string[],
  const F extends V[number],
  Args = unknown,
>(
  config: SwappableConfig<V, F, Args>
): SwappableConfig<V, F, Args> => config;

export function createSwappable<
  const V extends readonly string[],
  const F extends V[number],
  Args = unknown,
>(config: SwappableConfig<V, F, Args>) {
  type Variant = V[number];

  const {
    name = "Swappable",
    variants,
    fallback,
    useVariant: resolveVariant,
    variantProps = defaultVariantProps,
  } = config;

  if (!variants.includes(fallback)) {
    throw new Error(
      `${name}: fallback "${fallback}" is not one of variants [${variants.join(", ")}]`
    );
  }

  const Context = createContext<Variant | null>(null);

  const useVariant = (): Variant => {
    const variant = useContext(Context);
    if (variant === null) {
      throw new Error(
        `${name}: components must be rendered inside ${name}.Provider`
      );
    }
    return variant;
  };

  const useVariantProps = (): Record<string, unknown> =>
    variantProps({ variant: useVariant() });

  const Provider = ({
    children,
    ...args
  }: ProviderArgs<Args> & { children?: ReactNode }) => {
    const variant = resolveVariant(args as Args);
    if (!variants.includes(variant)) {
      throw new Error(
        `${name}: useVariant returned "${String(variant)}", expected one of [${variants.join(", ")}]`
      );
    }
    return <Context.Provider value={variant}>{children}</Context.Provider>;
  };
  Provider.displayName = `${name}.Provider`;

  const Match = ({ variant, children }: MatchProps<Variant>) => {
    const current = useVariant();
    const wanted: readonly Variant[] =
      typeof variant === "string" ? [variant] : variant;
    return wanted.includes(current) ? children : null;
  };
  Match.displayName = `${name}.Match`;

  /**
   * Picks the implementation for `variant`: the slot's own, or the fallback's
   * when the slot has none (`undefined`). An explicit `null` renders nothing.
   */
  const resolveImplementation = (
    map: SlotMap<Variant>,
    variant: Variant
  ): ComponentType<Record<string, unknown>> | null | undefined => {
    const own = map[variant];
    return own === undefined ? map[fallback] : own;
  };

  const buildSlot = (key: string, map: SlotMap<Variant>) => {
    const useRenderSlot = (
      props: Record<string, unknown>,
      only: Variant | undefined
    ) => {
      const current = useVariant();
      if (only !== undefined && current !== only) {
        return null;
      }
      const Implementation = resolveImplementation(map, current);
      if (!Implementation) {
        return null;
      }
      const injected = variantProps({ variant: current });
      return <Implementation {...injected} {...props} />;
    };

    const Slot = (props: Record<string, unknown>) =>
      useRenderSlot(props, undefined);
    Slot.displayName = `${name}.${key}`;

    for (const variant of variants) {
      const Only = (props: Record<string, unknown>) =>
        useRenderSlot(props, variant);
      Only.displayName = `${name}.${key}.${variant}`;
      Object.defineProperty(Slot, variant, { value: Only, enumerable: true });
    }

    return Slot;
  };

  return <S extends ValidSlots<Variant, F, S>>(
    slots: S
  ): Swappable<Variant, F, Args, S> => {
    const built: Record<string, unknown> = {
      Provider,
      Match,
      useVariant,
      useVariantProps,
      variants,
      fallback,
    };

    for (const [key, map] of Object.entries(slots)) {
      if (RESERVED_KEYS.has(key)) {
        throw new Error(
          `${name}: "${key}" is a reserved key and cannot be used as a slot name`
        );
      }
      built[key] = buildSlot(key, map as SlotMap<Variant>);
    }

    return built as Swappable<Variant, F, Args, S>;
  };
}
