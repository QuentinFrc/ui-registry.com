export type CatalogKind = "ui" | "library";

export interface CatalogEntry {
  href: string;
  kind: CatalogKind;
  name: string;
  slug: string;
  status: "alpha" | "beta" | "stable" | "planned";
  tagline: string;
}

export const catalog: readonly CatalogEntry[] = [
  {
    slug: "flash",
    name: "@ui-registry/flash",
    tagline:
      "Encode flash messages in the URL so they survive a redirect — Rails-style.",
    status: "alpha",
    kind: "library",
    href: "/packages/flash",
  },
  {
    slug: "swappable",
    name: "@ui-registry/swappable",
    tagline:
      "Swap component implementations by variant — responsive, platform, feature flag — with typed slots.",
    status: "alpha",
    kind: "library",
    href: "/packages/swappable",
  },
] as const;

export const catalogByKind = (kind: CatalogKind): readonly CatalogEntry[] =>
  catalog.filter((entry) => entry.kind === kind);
