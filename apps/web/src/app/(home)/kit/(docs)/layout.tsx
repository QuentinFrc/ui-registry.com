import { DocsLayout } from "@/components/docs-layout";

export default function KitDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsLayout backHref="/kit" backLabel="Kit">
      {children}
    </DocsLayout>
  );
}
