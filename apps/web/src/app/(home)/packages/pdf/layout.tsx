import Link from "next/link";
import { PdfDocsSidebar } from "@/components/pdf/pdf-docs-sidebar";
import { pdfDocsNav } from "@/lib/pdf-docs";

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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="flex items-baseline gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/libraries"
        >
          ← Libraries
        </Link>
        <span aria-hidden="true" className="text-muted-foreground/50">
          /
        </span>
        <span className="font-mono text-sm">@ui-registries/pdf</span>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <aside>
          <PdfDocsSidebar sections={pdfDocsNav} />
        </aside>
        <article className="prose-content flex min-w-0 max-w-3xl flex-col gap-6">
          {children}
        </article>
      </div>
    </main>
  );
}
