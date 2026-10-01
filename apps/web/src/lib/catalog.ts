export type CatalogKind = "kit" | "ui" | "library";

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
  kit: {
    label: "Kit",
    eyebrow: "00 — Kit",
    heading: "shadcn, upgraded",
    description:
      "shadcn's core, reworked for building real apps and scaling them — richer parts and variants, explicit UX behaviours, code that holds up as the app grows.",
    accent: "var(--color-accent-kit)",
    href: "/kit",
    emptyCopy: "First components land soon.",
  },
  ui: {
    label: "UI",
    eyebrow: "01 — UI",
    heading: "Blocks & add-ons",
    description:
      "Opinionated shadcn-compatible blocks built on the kit — patterns extracted from real client engagements.",
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
  {
    slug: "dialog-stack",
    name: "@ui-registry/dialog-stack",
    tagline:
      "Push dialogs and sheets from anywhere with typed props — rendered as one nested stack.",
    status: "alpha",
    kind: "library",
    href: "/packages/dialog-stack",
  },
] as const;

export const catalogByKind = (kind: CatalogKind): readonly CatalogEntry[] =>
  catalog.filter((entry) => entry.kind === kind);
