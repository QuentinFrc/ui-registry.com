# @ui-registry/swappable

Swap component implementations by variant (responsive, platform, feature flag) with typed slots.

> Status: pre-release. API may change.

## Install

```sh
pnpm add @ui-registry/swappable
```

## Usage

```tsx
import { createSwappable } from "@ui-registry/swappable";

const Layout = createSwappable({
  name: "Layout",
  variants: ["mobile", "desktop"],
  fallback: "desktop",
  useVariant: ({ initial }: { initial: "mobile" | "desktop" }) => initial,
})({
  Header: { mobile: HeaderMobile, desktop: HeaderDesktop },
  Sidebar: { mobile: null, desktop: Sidebar },
});

<Layout.Provider initial="desktop">
  <Layout.Header title="Hi" />
  <Layout.Sidebar.desktop items={items} />
  <Layout.Match variant="mobile">
    <BottomBar />
  </Layout.Match>
</Layout.Provider>;
```

Slot props are inferred from the fallback implementation. Unknown variant keys and incompatible implementations are compile errors.

See [ui-registry.com/packages/swappable](https://ui-registry.com/packages/swappable) for the case study and conventions.
