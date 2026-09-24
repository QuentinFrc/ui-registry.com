export type CatalogKind = "ui" | "library";

export type CatalogMedia =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "image"; src: string; alt: string };

export interface CatalogEntry {
  href: string;
  kind: CatalogKind;
  media?: CatalogMedia;
  name: string;
  slug: string;
  status: "alpha" | "beta" | "stable" | "planned";
  tagline: string;
}

export interface LaneMeta {
  accent: string;
  description: string;
  emptyCopy: string;
  eyebrow: string;
  heading: string;
  href: string;
  label: string;
}

export const LANE_META: Record<CatalogKind, LaneMeta> = {
  ui: {
    label: "UI",
    eyebrow: "01 — UI",
    heading: "Components & blocks",
    description:
      "Opinionated shadcn-compatible UI you copy in via the CLI — patterns extracted from real client engagements.",
    accent: "var(--color-accent-ui)",
    href: "/ui",
    emptyCopy: "First blocks land soon.",
  },
  library: {
    label: "Library",
    eyebrow: "02 — Libraries",
    heading: "Headless packages",
    description:
      "npm packages that solve one thing well — install, wire in, done. No copy-in, no fork.",
    accent: "var(--color-accent-library)",
    href: "/libraries",
    emptyCopy: "Nothing published yet.",
  },
};

export const catalog: readonly CatalogEntry[] = [
  {
    slug: "flash",
    name: "@ui-registry/flash",
    tagline:
      "Carry flash messages across redirects — typed, cataloged, signed when it matters.",
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
