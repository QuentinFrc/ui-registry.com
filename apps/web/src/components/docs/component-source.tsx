import type * as React from "react";
import { CodeCollapsibleWrapper } from "@/components/docs/code-collapsible-wrapper";
import { CopyButton } from "@/components/docs/copy-button";
import { getIconForLanguageExtension } from "@/components/icons";
import { cn } from "@/lib/cn";
import { highlightCode } from "@/lib/highlight-code";
import { getRegistryItem } from "@/lib/registry";

export async function ComponentSource({
  registry,
  name,
  title,
  language,
  collapsible = true,
  className,
  maxLines,
}: React.ComponentProps<"div"> & {
  registry: string;
  name: string;
  title?: string;
  language?: string;
  collapsible?: boolean;
  maxLines?: number;
}) {
  const item = getRegistryItem(registry, name);

  if (!item) {
    return null;
  }

  let code = item.files?.[0]?.content;
  if (!code) {
    return null;
  }

  code = code.trim();

  // Truncate code if maxLines is set.
  if (maxLines) {
    code = code.split("\n").slice(0, maxLines).join("\n");
  }

  const lang = language ?? title?.split(".").pop() ?? "tsx";
  const highlightedCode = await highlightCode(code, lang);

  if (!collapsible) {
    return (
      <div className={cn("relative", className)}>
        <ComponentCode
          code={code}
          highlightedCode={highlightedCode}
          language={lang}
          title={title}
        />
      </div>
    );
  }

  return (
    <CodeCollapsibleWrapper className={className}>
      <ComponentCode
        code={code}
        highlightedCode={highlightedCode}
        language={lang}
        title={title}
      />
    </CodeCollapsibleWrapper>
  );
}

function ComponentCode({
  code,
  highlightedCode,
  language,
  title,
}: {
  code: string;
  highlightedCode: string;
  language: string;
  title: string | undefined;
}) {
  return (
    <figure className="[&>pre]:max-h-96" data-rehype-pretty-code-figure="">
      {title && (
        <figcaption
          className="flex items-center gap-2 text-code-foreground [&_svg]:size-4 [&_svg]:text-code-foreground [&_svg]:opacity-70"
          data-language={language}
          data-rehype-pretty-code-title=""
        >
          {getIconForLanguageExtension(language)}
          {title}
        </figcaption>
      )}
      <CopyButton value={code} />
      <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    </figure>
  );
}
