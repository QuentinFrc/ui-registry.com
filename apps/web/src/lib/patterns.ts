import type { CatalogMedia } from "@/lib/catalog";
import { PDF_BLOCKS_BASE, PDF_DOCS_BASE, pdfBlocks } from "@/lib/pdf-docs";

/**
 * What a pattern ships with. A pattern is one problem solved end to end, so
 * its npm package and its copy-in blocks are parts of the same entry.
 */
export interface PatternPart {
  href: string;
  /** Short label shown on the card, e.g. "Library" or "Blocks". */
  kind: string;
  /** What you get, e.g. the package name or "6 documents". */
  label: string;
}

export interface Pattern {
  description: string;
  /** Main entry point of the pattern (usually its docs). */
  href: string;
  media?: CatalogMedia;
  /** Package name, used by the code placeholder when there is no media. */
  name: string;
  parts: readonly PatternPart[];
  slug: string;
  status: "alpha" | "beta" | "stable" | "planned";
  /** What the pattern lets you do, as a sentence. */
  title: string;
}

export const patterns: readonly Pattern[] = [
  {
    slug: "pdf",
    name: "@ui-registries/pdf",
    title: "Make beautiful PDFs with React, Tailwind or inline CSS.",
    description:
      "Primitives and a Tailwind engine on top of react-pdf — themes, fonts, SVG, multi-page layouts — plus ready-made documents you copy in with the shadcn CLI.",
    status: "alpha",
    href: PDF_DOCS_BASE,
    media: {
      kind: "pages",
      srcs: [
        "/previews/pdf/resume-1.png",
        "/previews/pdf/invoice-1.png",
        "/previews/pdf/report-1.png",
      ],
      alt: "Report, invoice and resume PDFs",
    },
    parts: [
      { kind: "Library", label: "@ui-registries/pdf", href: PDF_DOCS_BASE },
      {
        kind: "Blocks",
        label: `${pdfBlocks.length} documents`,
        href: PDF_BLOCKS_BASE,
      },
    ],
  },
  {
    slug: "swappable",
    name: "@ui-registries/swappable",
    title: "Swap components by breakpoint, platform or feature flag.",
    description:
      "One component, several implementations: pick the right one per variant with typed slots, instead of scattering conditionals through the tree.",
    status: "alpha",
    href: "/packages/swappable",
    parts: [
      {
        kind: "Library",
        label: "@ui-registries/swappable",
        href: "/packages/swappable",
      },
    ],
  },
  {
    slug: "flash",
    name: "@ui-registries/flash",
    title: "Show messages that survive a redirect.",
    description:
      "Rails-style flash messages encoded in the URL: set one before redirecting, show it as a toast on the next page. No session, no cookie.",
    status: "alpha",
    href: "/packages/flash",
    parts: [
      {
        kind: "Library",
        label: "@ui-registries/flash",
        href: "/packages/flash",
      },
    ],
  },
] as const;
