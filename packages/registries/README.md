# @repo/registries

A collection of independent [shadcn](https://ui.shadcn.com)-compatible registries. Each registry is a set of components and blocks that consumers can install via `shadcn add`.

## Structure

```
packages/registries/
  build.mts              # Discovers & builds all registries
  demo/                  # "demo" registry
    components.json      # shadcn config (aliases, style)
    registry.json        # Registry manifest (items list)
    registry/
      base-nova/
        hello-world/
          hello-world.tsx
```

Each subdirectory containing a `registry.json` file is treated as an independent registry.

## Creating a new registry

1. Create a new directory under `packages/registries/` (e.g. `my-registry/`).
2. Add a `components.json` with your shadcn configuration:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": false,
  "tsx": true,
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "ui": "@/components/ui",
    "utils": "@/lib/utils"
  }
}
```

3. Add a `registry.json` manifest:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "my-registry",
  "homepage": "https://example.com",
  "items": [
    {
      "name": "my-component",
      "type": "registry:block",
      "title": "My Component",
      "description": "A description of the component.",
      "registryDependencies": ["button"],
      "files": [
        {
          "path": "registry/base-nova/my-component/my-component.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

4. Add your component files under `registry/base-nova/<name>/`.

The build script will automatically discover and build it.

## Building

```sh
# Build all registries
pnpm build

# Output goes to dist/<registry-name>/
```

## How it works

1. `build.mts` scans for subdirectories containing `registry.json`.
2. Runs `shadcn build` for each registry, outputting JSON files to `dist/<name>/`.
3. The `apps/web` prebuild script copies `dist/*` into `public/r/` so the files are served statically.
4. Consumers install components via:

```sh
pnpm dlx shadcn@latest add https://your-domain.com/r/demo/hello-world.json
```

## Registry dependencies

Components can reference base shadcn components (e.g. `button`, `input`) via `registryDependencies` in `registry.json`. These are automatically installed on the consumer side when using `shadcn add`.
