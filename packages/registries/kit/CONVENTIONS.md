# Kit conventions

The rules every kit component follows. They are what makes the kit *one* set rather than a pile of opinions. Read this before writing anything; a component that breaks a rule here is a bug.

## 1. Shared core

- **shadcn upgrades are drop-in.** A kit `dialog.tsx` (`meta.origin: "shadcn"`) exports everything shadcn's `dialog.tsx` exports, with compatible props. Swapping the file must not break existing call sites. Changes are additive: new parts, new props, new variants. Removing or renaming a shadcn export needs a migration paragraph in the docs.
- **Kit-native components look native.** A component shadcn does not have (`meta.origin: "kit"`) uses the same vocabulary, parts and variants as the rest, so nobody can tell from the API which ones shadcn started.
- **Base UI underneath.** The kit targets shadcn's `base-nova` style: primitives come from `@base-ui/react`. Use its `render` prop for composition; never introduce `asChild`.

## 2. Parts

- **Every part is a component.** Anything a consumer might style, replace or reorder is exported as a named part (`DialogHeader`, `DialogBody`, `DialogFooter`, …), not baked into a parent's JSX.
- **`data-slot` on every part**, kebab-cased after the export name: `DialogBody` → `data-slot="dialog-body"`. Parts are styleable from CSS and from parents with `[&_[data-slot=…]]` without reaching into implementation.
- **Structural parts are exported even when composed.** `DialogContent` renders Portal → Overlay → Viewport → Popup for convenience; `DialogViewport` and `DialogPopup` remain exported for manual composition.
- **Sibling components share part vocabulary.** Dialog and Sheet expose the same parts with the same props and differ only in styling. When two components model the same thing, their APIs match.

## 3. Variants and sizes

- **`cva` for every variant axis, exported as `<name>Variants`** (`buttonVariants`), so consumers can reuse the classes on other elements.
- **One size scale across the kit:** `xs`, `sm`, `default`, `lg`. Icon-only variants are `icon-xs`, `icon-sm`, `icon`, `icon-lg`. No component invents its own scale.
- **Variant names are shared.** `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` mean the same thing everywhere they appear.
- **Defaults are declared** in `defaultVariants` and mirrored as prop defaults in the component signature.

## 4. Behavioural props

- **Behaviour is a prop, not a className.** Scroll strategy, sticky slots, stacking style — anything that changes layout logic — is an explicit, typed prop (`scroll: "body" | "content" | "portal"`), documented, with a default.
- **Propagate through `data-*`, not context.** A prop set on a container reaches its parts as a `data-` attribute (`data-scroll="content"`) so parts style themselves with variants and stay server-renderable. Reach for React context only when data attributes cannot express the relationship.
- **Booleans read as states:** `showCloseButton`, `sticky`, `disabled`. No `isX`/`hasX` prefixes, no negative flags (`noPadding`).

## 5. Styling

- **Tailwind classes only**, merged with `cn(...)` from `@/lib/utils`. No inline styles except for values that are truly dynamic.
- **`className` always last** in the `cn()` call so consumers win.
- **Design tokens over raw colours.** `bg-background`, `text-muted-foreground`, `ring-ring/50`, never `bg-neutral-900`.
- **Animations from `tw-animate-css`** driven by Base UI's `data-open` / `data-closed`, consistent durations across overlays.

## 6. Files and dependencies

- **One component per file** at `registry/base-nova/ui/<name>.tsx`; multi-file components are a `registry:ui` item with several files in the same folder.
- **Imports use shadcn aliases:** `@/components/ui/<name>`, `@/lib/utils`, `@/hooks/<name>`. They are rewritten to the consumer's aliases on install.
- **Kit depends on kit.** A kit component references other kit components by URL in `registryDependencies`, and stock shadcn components by bare name. Nothing in the kit depends on another registry of this repo.
- **npm dependencies are declared** in the item's `dependencies`, pinned to the same versions the web app uses.

## 7. Documentation

- Each component has a page under `/kit/<name>` with: **Origin** (what real usage broke, or why shadcn lacked it), **What changed** or **API**, **Install**, and live demos.
- The item `description` is one sentence a reader scans in the list: what it does, not why.
