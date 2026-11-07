import type { CatalogMedia } from "@/lib/catalog";
import { PDF_DOCS_BASE } from "@/lib/pdf-docs";
import pdfPackage from "../../../../packages/pdf/package.json";

/** One problem solved end to end: its library and its blocks together. */
export interface Pattern {
  description: string;
  /** Main entry point of the pattern (usually its docs). */
  href: string;
  media?: CatalogMedia;
  /** Package name, used by the code placeholder when there is no media. */
  name: string;
  slug: string;
  status: "alpha" | "beta" | "stable" | "planned";
  /** What the pattern lets you do, as a sentence. */
  title: string;
  /** Published version of the package. */
  version: string;
}

export const patterns: readonly Pattern[] = [
  {
    slug: "pdf",
    name: "@ui-registries/pdf",
    title: "Make beautiful PDFs with React, Tailwind or inline CSS.",
    description:
      "Primitives and a Tailwind engine on top of react-pdf — themes, fonts, SVG, multi-page layouts — plus ready-made documents you copy in with the shadcn CLI.",
    status: "alpha",
    version: pdfPackage.version,
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
  },
] as const;
