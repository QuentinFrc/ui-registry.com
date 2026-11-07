import { PackageHeader } from "@/components/docs/package-header";
import { PDF_BLOCKS_BASE, PDF_DOCS_BASE } from "@/lib/pdf-docs";

const TABS = [
  { href: PDF_DOCS_BASE, label: "Library" },
  { href: PDF_BLOCKS_BASE, label: "Blocks" },
] as const;

/** Switches between the PDF library docs and the PDF blocks. */
export function PdfTabs() {
  return <PackageHeader name="@ui-registries/pdf" tabs={TABS} />;
}
