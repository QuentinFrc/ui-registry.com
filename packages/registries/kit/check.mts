import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const kitDir = resolve(import.meta.dirname);
const registryJsonPath = join(kitDir, "registry.json");

export const KIT_STYLE_ITEM = "kit";
export const KIT_REGISTRY_BASE_URL = "https://ui-registry.com/r/kit";

/**
 * Where a kit component comes from:
 * - `shadcn`: an upgrade of the shadcn component of the same name (drop-in).
 * - `kit`: a component shadcn does not have.
 */
const ORIGINS = new Set(["shadcn", "kit"]);

interface RegistryItem {
  meta?: { origin?: string; [key: string]: unknown };
  name: string;
  registryDependencies?: string[];
  type: string;
  [key: string]: unknown;
}

interface RegistryJson {
  items: RegistryItem[];
  [key: string]: unknown;
}

function readRegistry(): RegistryJson {
  return JSON.parse(readFileSync(registryJsonPath, "utf-8")) as RegistryJson;
}

function componentItems(registry: RegistryJson): RegistryItem[] {
  return registry.items.filter((item) => item.name !== KIT_STYLE_ITEM);
}

/** The `kit` style item depends on every component the kit ships. */
export function expectedKitDependencies(registry: RegistryJson): string[] {
  return componentItems(registry).map(
    (item) => `${KIT_REGISTRY_BASE_URL}/${item.name}.json`
  );
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setB = new Set(b);
  return a.every((value) => setB.has(value));
}

/**
 * Verifies the kit is consistent: the style item installs everything, and
 * every component says where it comes from.
 */
export function checkKit(): string[] {
  const errors: string[] = [];
  const registry = readRegistry();

  const styleItem = registry.items.find((item) => item.name === KIT_STYLE_ITEM);
  if (!styleItem) {
    errors.push(`Missing "${KIT_STYLE_ITEM}" style item`);
  } else if (styleItem.type !== "registry:style") {
    errors.push(`"${KIT_STYLE_ITEM}" item must be of type registry:style`);
  } else if (
    !sameSet(
      styleItem.registryDependencies ?? [],
      expectedKitDependencies(registry)
    )
  ) {
    errors.push(
      `"${KIT_STYLE_ITEM}" style item does not list every component — run \`pnpm --filter @repo/registries kit:sync\``
    );
  }

  for (const item of componentItems(registry)) {
    if (item.type !== "registry:ui") {
      errors.push(`Item "${item.name}" must be of type registry:ui`);
    }
    const origin = item.meta?.origin;
    if (!(origin && ORIGINS.has(origin))) {
      errors.push(
        `Item "${item.name}" needs meta.origin: "shadcn" (upgrade) or "kit" (new)`
      );
    }
  }

  return errors;
}

/** Rewrites the `kit` style item dependencies from the shipped components. */
export function syncKit(): void {
  const registry = readRegistry();
  const styleItem = registry.items.find((item) => item.name === KIT_STYLE_ITEM);
  if (!styleItem) {
    throw new Error(`Missing "${KIT_STYLE_ITEM}" style item in registry.json`);
  }
  styleItem.registryDependencies = expectedKitDependencies(registry);
  writeFileSync(registryJsonPath, `${JSON.stringify(registry, null, 2)}\n`);
}

// Run standalone: `tsx check.mts` (check) or `tsx check.mts --sync`
if (process.argv[1]?.endsWith("check.mts")) {
  if (process.argv.includes("--sync")) {
    syncKit();
    console.log("kit: style item synced");
  } else {
    const errors = checkKit();
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
    console.log("kit: consistent");
  }
}
