import { DocsLayout } from "@/components/docs-layout";

export default function PackagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsLayout backHref="/libraries" backLabel="Libraries">
      {children}
    </DocsLayout>
  );
}
