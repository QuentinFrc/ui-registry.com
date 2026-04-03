import type * as React from "react";
import { ComponentSource } from "@/components/docs/component-source";
import { cn } from "@/lib/cn";
import { getRegistryItem } from "@/lib/registry";

export function ComponentPreview({
  registry,
  name,
  className,
  previewClassName,
  align = "center",
  hideCode = false,
  caption,
  ...props
}: React.ComponentProps<"div"> & {
  registry: string;
  name: string;
  align?: "center" | "start" | "end";
  description?: string;
  hideCode?: boolean;
  previewClassName?: string;
  caption?: string;
}) {
  const item = getRegistryItem(registry, name);

  if (!item) {
    return (
      <p className="mt-6 text-muted-foreground text-sm">
        Component{" "}
        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
          {name}
        </code>{" "}
        not found in registry.
      </p>
    );
  }

  const content = (
    <div
      className={cn(
        "group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border",
        className
      )}
      data-slot="component-preview"
      {...props}
    >
      <div
        className={cn(
          "preview relative flex h-72 w-full justify-center p-10 data-[align=start]:items-start data-[align=end]:items-end data-[align=center]:items-center",
          previewClassName
        )}
        data-align={align}
        data-slot="preview"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-primary text-xs">
            {item.type}
          </span>
          <span className="font-medium text-sm">{item.title}</span>
          <p className="max-w-md text-muted-foreground text-sm">
            {item.description}
          </p>
        </div>
      </div>
      {!hideCode && (
        <div
          className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
          data-slot="code"
        >
          <ComponentSource
            collapsible={false}
            name={name}
            registry={registry}
          />
        </div>
      )}
    </div>
  );

  if (caption) {
    return (
      <figure
        className="flex flex-col data-[hide-code=true]:gap-4"
        data-hide-code={hideCode}
      >
        {content}
        <figcaption className="-mt-8 text-center text-muted-foreground text-sm data-[hide-code=true]:mt-0">
          {caption}
        </figcaption>
      </figure>
    );
  }

  return content;
}
