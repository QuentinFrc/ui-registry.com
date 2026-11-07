import { DocsShell } from "@/components/docs/docs-shell";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { PackageHeader } from "@/components/docs/package-header";
import { flattenNav } from "@/lib/docs-nav";
import { guideDocsNav } from "@/lib/guide-docs";

export const metadata = {
  title: {
    template: "%s · @ui-registries/guide",
    default: "@ui-registries/guide",
  },
};

export default function GuideDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsShell
      header={<PackageHeader name="@ui-registries/guide" />}
      pager={flattenNav(guideDocsNav)}
      sidebar={
        <DocsSidebar label="Guide documentation" sections={guideDocsNav} />
      }
    >
      {children}
    </DocsShell>
  );
}
