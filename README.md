# ui-registry

Headless libraries extracted from real client engagements, paired with their shadcn-compatible UI counterparts — presented as case studies, not as a unified component library.

See [`ui-registry-spec.md`](./ui-registry-spec.md) for the project vision and scope.

## Status

Early. Base scaffolding in place; first package (`@ui-registry/flash`) not yet published.

## Layout

```
apps/
  web/                    # ui-registry.com — Next.js 16 + MDX
packages/
  ui/                     # internal shadcn-compatible component pool
  registries/             # shadcn registry build pipeline
  typescript-config/      # shared tsconfigs
```

Future per-spec: `packages/<name>/` for headless libs (npm), `registry/` at root for shadcn distribution.

## Commands

```sh
pnpm install
pnpm dev          # run all dev tasks
pnpm build        # build everything
pnpm check        # ultracite lint
pnpm fix          # ultracite autofix
```
