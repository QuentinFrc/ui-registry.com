import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/callout";
import { PdfPreview } from "@/components/pdf/pdf-preview";
import { PropsTable } from "@/components/pdf/props-table";

const globalComponents: MDXComponents = {
  Callout,
  PdfPreview,
  PropsTable,
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...globalComponents, ...components };
}
