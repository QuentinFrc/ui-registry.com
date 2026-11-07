import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/callout";
import { ComponentPreview } from "@/components/docs/component-preview";
import { MdxPre } from "@/components/docs/mdx-pre";
import { BlocksCallout } from "@/components/pdf/blocks-callout";
import { PropsTable } from "@/components/pdf/props-table";

const globalComponents: MDXComponents = {
  BlocksCallout,
  Callout,
  ComponentPreview,
  PropsTable,
  pre: MdxPre,
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...globalComponents, ...components };
}
