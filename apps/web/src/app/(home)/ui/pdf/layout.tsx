import { DocsShell } from "@/components/docs/docs-shell";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { PdfTabs } from "@/components/pdf/pdf-tabs";
import { flattenNav } from "@/lib/docs-nav";
import { pdfBlocksNav } from "@/lib/pdf-docs";

export const metadata = {
  title: {
    template: "%s · PDF blocks",
    default: "PDF blocks",
  },
};

export default function PdfBlocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsShell
      header={<PdfTabs />}
      pager={flattenNav(pdfBlocksNav)}
      sidebar={<DocsSidebar label="PDF blocks" sections={pdfBlocksNav} />}
    >
      {children}
    </DocsShell>
  );
}
