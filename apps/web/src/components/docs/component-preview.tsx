import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PreviewName } from "@registry/pdf/previews";
import { highlightCode } from "@repo/ui/lib/highlighter";
import { PdfPages } from "@/components/pdf/pdf-pages";
import { ComponentPreviewTabs } from "./component-preview-tabs";

const EXAMPLES_DIR = resolve(
  process.cwd(),
  "../../packages/registries/pdf/examples"
);
// Examples import the registry sources; once installed they live here.
const REGISTRY_IMPORT = /"\.\.\/registry\/base-nova\/pdf\//g;
const INSTALLED_IMPORT = '"@/components/pdf/';
const TRAILING_NEWLINE = /\n$/;

interface ComponentPreviewProps {
  /** Max height of the preview frame, in px. */
  height?: number;
  /** Hide the source under the preview. */
  hideCode?: boolean;
  name: PreviewName;
  scroll?: "start" | "end";
}

/**
 * A registry example: rendered pages on top, its source underneath (collapsed
 * until "View code"), like shadcn's ComponentPreview.
 */
export async function ComponentPreview({
  height,
  hideCode = false,
  name,
  scroll,
}: ComponentPreviewProps) {
  const code = readFileSync(resolve(EXAMPLES_DIR, `${name}.tsx`), "utf-8")
    .replace(REGISTRY_IMPORT, INSTALLED_IMPORT)
    .replace(TRAILING_NEWLINE, "");
  const lines = (await highlightCode(code, "tsx")) ?? code.split("\n");

  return (
    <ComponentPreviewTabs
      code={code}
      hideCode={hideCode}
      lines={lines}
      preview={<PdfPages height={height} name={name} scroll={scroll} />}
      title={`${name}-example.tsx`}
    />
  );
}
