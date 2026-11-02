import registryJson from "@registry/pdf/registry.json";
import type {
  DocsNavLink,
  DocsNavSection,
} from "@/components/docs/docs-sidebar";

/** Library docs. */
export const PDF_DOCS_BASE = "/packages/pdf";
/** Blocks live in the UI lane, next to the other copy-in blocks. */
export const PDF_BLOCKS_BASE = "/ui/pdf";
export const PDF_INSTALL_BASE = "https://ui-registry.com/r/pdf";

interface RegistryItemLike {
  description?: string;
  name: string;
  title?: string;
  type: string;
}

const registry = registryJson as { items: RegistryItemLike[] };

export interface PdfRegistryItem {
  description: string;
  href: string;
  name: string;
  title: string;
}

const toItem =
  (base: string) =>
  (item: RegistryItemLike): PdfRegistryItem => ({
    name: item.name,
    title: item.title ?? item.name,
    description: item.description ?? "",
    href: `${base}/${item.name}`,
  });

/** Copy-in components (`registry:ui` items), in registry order. */
export const pdfComponents: readonly PdfRegistryItem[] = registry.items
  .filter((item) => item.type === "registry:ui")
  .map(toItem(`${PDF_DOCS_BASE}/registry`));

/** Full documents (`registry:block` items), in registry order. */
export const pdfBlocks: readonly PdfRegistryItem[] = registry.items
  .filter((item) => item.type === "registry:block")
  .map(toItem(PDF_BLOCKS_BASE));

const page = (slug: string, title: string): DocsNavLink => ({
  href: slug ? `${PDF_DOCS_BASE}/${slug}` : PDF_DOCS_BASE,
  title,
});

const PRIMITIVES = [
  ["block", "Block"],
  ["text", "Text"],
  ["page", "Page"],
  ["image", "Image"],
  ["link", "Link"],
  ["document", "Document"],
  ["canvas", "Canvas"],
  ["note", "Note"],
  ["page-number", "PageNumber"],
] as const;

export const pdfDocsNav: readonly DocsNavSection[] = [
  {
    title: "Getting started",
    links: [
      page("", "Introduction"),
      page("installation", "Installation"),
      page("quick-start", "Quick start"),
      page("key-concepts", "Key concepts"),
    ],
  },
  {
    title: "Primitives",
    links: PRIMITIVES.map(([slug, title]) => page(`components/${slug}`, title)),
  },
  {
    title: "UI components",
    links: [
      page("registry", "Introduction"),
      ...pdfComponents.map(({ href, title }) => ({ href, title })),
    ],
  },
  {
    title: "Styling",
    links: [
      page("utility-classes", "Utility classes"),
      page("theming", "Theming"),
      page("fonts", "Fonts"),
    ],
  },
  {
    title: "Utilities",
    links: [
      page("helpers", "Helpers"),
      page("svg", "SVG"),
      page("re-exports", "Re-exports"),
      page("api-reference", "API reference"),
    ],
  },
];

export const pdfBlocksNav: readonly DocsNavSection[] = [
  {
    title: "PDF blocks",
    links: [
      { href: PDF_BLOCKS_BASE, title: "Overview" },
      ...pdfBlocks.map(({ href, title }) => ({ href, title })),
    ],
  },
];

/** Every page of a nav, in reading order (previous / next links). */
export const flattenNav = (
  sections: readonly DocsNavSection[]
): readonly DocsNavLink[] => sections.flatMap((section) => section.links);
