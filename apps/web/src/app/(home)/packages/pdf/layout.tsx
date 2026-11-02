import { DocsShell } from "@/components/docs/docs-shell";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { PdfTabs } from "@/components/pdf/pdf-tabs";
import { flattenNav, pdfDocsNav } from "@/lib/pdf-docs";

export const metadata = {
  title: {
    template: "%s · @ui-registries/pdf",
    default: "@ui-registries/pdf",
  },
};

export default function PdfDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsShell
      header={<PdfTabs />}
      pager={flattenNav(pdfDocsNav)}
      sidebar={<DocsSidebar label="PDF documentation" sections={pdfDocsNav} />}
    >
      {children}
    </DocsShell>
  );
}
