# kit

shadcn, upgraded for building real apps and scaling them. The kit shares shadcn's core — Base UI primitives, the `base-nova` style, its tokens, aliases and naming — and reworks the components where a starter kit stops and a real application begins:

- **UI:** richer parts and variants, so layouts that every app ends up needing (a dialog body that scrolls, a sticky footer, a sized icon button) are one prop away instead of a rewrite.
- **UX:** behaviours made explicit and typed — scroll strategy, stacking, sticky slots — with sane defaults, so the product decision is visible in the code.
- **Code:** conventions that hold up as the app grows: one vocabulary across components, every part addressable, nothing baked in that a team will need to reach into later.

It is one set, not a pile of items: same conventions everywhere, one install for the whole thing. It is **not** a mirror of shadcn either. Some shadcn components get an upgraded version here, some are simply not part of the kit, and some exist only here because apps need them. What is in the kit is exactly what `registry.json` lists.

## Two kinds of components

Every component item carries `meta.origin`:

| origin   | Meaning                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------- |
| `shadcn` | An upgrade of the shadcn component with the same name. Drop-in: same exports, more parts and props. |
| `kit`    | A component shadcn does not have, built with the same conventions.                                  |

The `kit` style item depends on every component, so `shadcn init @kit/kit` installs the whole set. `check.mts` keeps that list in sync and makes sure every component states its origin. It runs in `validate` and `build`.

## Adding a component

1. Write `registry/base-nova/ui/<name>.tsx`, following [`CONVENTIONS.md`](./CONVENTIONS.md). Import siblings as `@/components/ui/<name>` and helpers as `@/lib/utils`.
2. Add a `registry:ui` item named `<name>` to `registry.json` with `meta.origin`. Reference other kit components by URL (`https://ui-registry.com/r/kit/<name>.json`) and untouched shadcn components by bare name.
3. `pnpm --filter @repo/registries kit:sync`, then `validate`.
4. Document it under `apps/web/src/app/(home)/kit/<name>/`.

The registry file **is** the source. The web app resolves `@/components/ui/<name>` to it through the `@registry/*` alias; nothing is copied.

## Installing

```sh
# one component — an upgrade overrides the shadcn file of the same name
pnpm dlx shadcn@latest add https://ui-registry.com/r/kit/dialog.json

# or register the namespace once in components.json
"registries": { "@kit": "https://ui-registry.com/r/kit/{name}.json" }
pnpm dlx shadcn@latest add @kit/dialog

# the whole set, on a fresh project
pnpm dlx shadcn@latest init @kit/kit
```

## Commands

```sh
pnpm --filter @repo/registries kit:check   # style item ↔ components, origins
pnpm --filter @repo/registries kit:sync    # regenerate the kit style item
pnpm --filter @repo/registries validate    # all registries, includes kit:check
pnpm --filter @repo/registries build       # dist/kit/*.json
```
