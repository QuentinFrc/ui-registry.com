import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsCodeBlock } from "@/components/docs/code-block";
import { GUIDE_INSTALL_BASE, guideRegistryItems } from "@/lib/guide-docs";

const REGISTRY_DIR = resolve(process.cwd(), "../../packages/registries/guide");

const findItem = (name: string) =>
  guideRegistryItems.find((item) => item.name === name);

export const generateStaticParams = () =>
  guideRegistryItems.map(({ name }) => ({ name }));

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const item = findItem((await params).name);
  return item ? { title: item.title, description: item.description } : {};
}

export default async function GuideRegistryItemPage({ params }: PageProps) {
  const item = findItem((await params).name);
  if (!item) {
    notFound();
  }

  const source = readFileSync(resolve(REGISTRY_DIR, item.file), "utf8");
  const fileName = basename(item.file);
  const language = fileName.endsWith(".tsx") ? "tsx" : "ts";

  return (
    <>
      <h1>{item.title}</h1>
      <p>{item.description}</p>

      <h2 id="installation">Installation</h2>
      <DocsCodeBlock
        code={`pnpm dlx shadcn@latest add ${GUIDE_INSTALL_BASE}/${item.name}`}
        language="sh"
      />

      <h2 id="source">Source</h2>
      <p>
        The file you get once installed. It is yours: edit the markup, the
        labels and the styles.
      </p>
      <DocsCodeBlock code={source} language={language} title={fileName} />
    </>
  );
}
