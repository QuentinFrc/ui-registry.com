import registryJson from "@registry/pdf/registry.json";

export const PDF_DOCS_BASE = "/packages/pdf";
export const PDF_INSTALL_BASE = "https://ui-registry.com/r/pdf";

export interface PdfDocsLink {
  href: string;
  title: string;
}

export interface PdfDocsSection {
  links: readonly PdfDocsLink[];
  title: string;
}

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
  (section: "registry" | "blocks") =>
  (item: RegistryItemLike): PdfRegistryItem => ({
    name: item.name,
    title: item.title ?? item.name,
    description: item.description ?? "",
    href: `${PDF_DOCS_BASE}/${section}/${item.name}`,
  });

/** Copy-in components (`registry:ui` items), in registry order. */
export const pdfComponents: readonly PdfRegistryItem[] = registry.items
  .filter((item) => item.type === "registry:ui")
  .map(toItem("registry"));

/** Full documents (`registry:block` items), in registry order. */
export const pdfBlocks: readonly PdfRegistryItem[] = registry.items
  .filter((item) => item.type === "registry:block")
  .map(toItem("blocks"));

const page = (slug: string, title: string): PdfDocsLink => ({
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

export const pdfDocsNav: readonly PdfDocsSection[] = [
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
    title: "Blocks",
    links: [
      page("blocks", "Overview"),
      ...pdfBlocks.map(({ href, title }) => ({ href, title })),
    ],
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
