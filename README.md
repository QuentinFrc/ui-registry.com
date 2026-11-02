# ui-registry

Headless libraries extracted from real client engagements, paired with their shadcn-compatible UI counterparts — presented as case studies, not as a unified component library.

See [`ui-registry-spec.md`](./ui-registry-spec.md) for the project vision and scope.

## Status

Early. Published to npm under the `@ui-registries` scope (`@ui-registry` is taken):

| Package | |
| --- | --- |
| [`@ui-registries/pdf`](./packages/pdf) | React primitives for PDF generation with react-pdf and Tailwind classes |
| [`@ui-registries/flash`](./packages/flash) | Flash messages encoded in the URL, surviving a redirect |
| [`@ui-registries/swappable`](./packages/swappable) | Swap component implementations by variant, with typed slots |

## Layout

```
apps/
  web/                    # ui-registry.com — Next.js 16 + MDX
packages/
  pdf/ flash/ swappable/  # npm packages (@ui-registries/*)
  ui/                     # internal shadcn-compatible component pool
  registries/             # shadcn registry build pipeline
    kit/                  # the component kit — shadcn upgraded, source of truth
    pdf/                  # PDF components and blocks (+ previews and visual tests)
  typescript-config/      # shared tsconfigs
```

## Commands

```sh
pnpm install
pnpm dev          # run all dev tasks
pnpm build        # build everything
pnpm check        # ultracite lint
pnpm fix          # ultracite autofix
```
pnpm test         # unit tests + PDF visual regression tests
```

## PDF previews

Every PDF component and block has a preview document in `packages/registries/pdf/previews.tsx`.

```sh
# Docs images (apps/web/public/previews/pdf): PDF + one PNG per page
pnpm --filter @repo/registries pdf:previews

# Visual tests compare renders with packages/registries/pdf/__screenshots__;
# after an intended visual change:
UPDATE_SNAPSHOTS=1 pnpm --filter @repo/registries test
```

## Releasing

Releases go through [changesets](https://github.com/changesets/changesets):

1. Add a changeset to your PR: `pnpm changeset`.
2. On merge to `main`, the Release workflow opens (or updates) a "Version packages" PR.
3. Merging that PR publishes the bumped packages to npm, with provenance.

The workflow needs an `NPM_TOKEN` repository secret and "Allow GitHub Actions to create and approve pull requests" enabled in the repository settings.
