import registryJson from "@registry/guide/registry.json";
import type {
  DocsNavLink,
  DocsNavSection,
} from "@/components/docs/docs-sidebar";

export const GUIDE_DOCS_BASE = "/packages/guide";
export const GUIDE_INSTALL_BASE = "https://ui-registry.com/r/guide";

interface RegistryFile {
  path: string;
}

interface RegistryItemLike {
  description?: string;
  files?: RegistryFile[];
  name: string;
  title?: string;
  type: string;
}

const registry = registryJson as { items: RegistryItemLike[] };

export interface GuideRegistryItem {
  description: string;
  /** Source file, relative to `packages/registries/guide`. */
  file: string;
  href: string;
  name: string;
  title: string;
}

/** Copy-in components and helpers, in registry order. */
export const guideRegistryItems: readonly GuideRegistryItem[] =
  registry.items.map((item) => ({
    name: item.name,
    title: item.title ?? item.name,
    description: item.description ?? "",
    file: item.files?.[0]?.path ?? "",
    href: `${GUIDE_DOCS_BASE}/registry/${item.name}`,
  }));

const page = (slug: string, title: string): DocsNavLink => ({
  href: slug ? `${GUIDE_DOCS_BASE}/${slug}` : GUIDE_DOCS_BASE,
  title,
});

export const guideDocsNav: readonly DocsNavSection[] = [
  {
    title: "Getting started",
    links: [
      page("", "Introduction"),
      page("installation", "Installation"),
      page("quick-start", "Quick start"),
    ],
  },
  {
    title: "Concepts",
    links: [
      page("steps-and-anchors", "Steps & anchors"),
      page("guides", "Guides & orchestration"),
      page("content", "Content"),
      page("frame", "Frame"),
      page("modes", "Modes & triggers"),
      page("hints", "Hints"),
      page("persistence", "Persistence"),
      page("errors", "Errors & dismissible"),
    ],
  },
  {
    title: "UI components",
    links: guideRegistryItems.map(({ href, title }) => ({ href, title })),
  },
  {
    title: "Reference",
    links: [page("decisions", "Design decisions")],
  },
];
