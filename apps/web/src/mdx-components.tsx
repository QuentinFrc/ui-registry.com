import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui/components/ui/alert";
import { AspectRatio } from "@repo/ui/components/ui/aspect-ratio";
import { Button } from "@repo/ui/components/ui/button";
import { Kbd } from "@repo/ui/components/ui/kbd";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { Callout } from "@/components/docs/callout";
import { CodeBlockCommand } from "@/components/docs/code-block-command";
import { CodeCollapsibleWrapper } from "@/components/docs/code-collapsible-wrapper";
import { CodeTabs } from "@/components/docs/code-tabs";
import { ComponentPreview } from "@/components/docs/component-preview";
import { ComponentSource } from "@/components/docs/component-source";
import { CopyButton } from "@/components/docs/copy-button";
import { InstallCommand } from "@/components/docs/install-command";
import { getIconForLanguageExtension } from "@/components/icons";
import { cn } from "@/lib/cn";

export const mdxComponents = {
  h1: ({ className, ...props }: React.ComponentProps<"h1">) => (
    <h1
      className={cn(
        "mt-2 scroll-m-28 font-bold font-heading text-3xl tracking-tight",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.ComponentProps<"h2">) => {
    return (
      <h2
        className={cn(
          "mt-10 scroll-m-28 font-heading font-medium text-xl tracking-tight first:mt-0 lg:mt-12 [&+.steps>h3]:mt-4! [&+.steps]:mt-0! [&+h3]:mt-6! [&+p]:mt-4! [&+]*:[code]:text-xl",
          className
        )}
        id={props.children
          ?.toString()
          .replace(/ /g, "-")
          .replace(/'/g, "")
          .replace(/\?/g, "")
          .toLowerCase()}
        {...props}
      />
    );
  },
  h3: ({ className, ...props }: React.ComponentProps<"h3">) => (
    <h3
      className={cn(
        "mt-12 scroll-m-28 font-heading font-medium text-lg tracking-tight [&+p]:mt-4! *:[code]:text-xl",
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.ComponentProps<"h4">) => (
    <h4
      className={cn(
        "mt-8 scroll-m-28 font-heading font-medium text-base tracking-tight",
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: React.ComponentProps<"h5">) => (
    <h5
      className={cn(
        "mt-8 scroll-m-28 font-medium text-base tracking-tight",
        className
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: React.ComponentProps<"h6">) => (
    <h6
      className={cn(
        "mt-8 scroll-m-28 font-medium text-base tracking-tight",
        className
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }: React.ComponentProps<"a">) => (
    <a
      className={cn("font-medium underline underline-offset-4", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.ComponentProps<"p">) => (
    <p
      className={cn("leading-relaxed [&:not(:first-child)]:mt-6", className)}
      {...props}
    />
  ),
  strong: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className={cn("font-medium", className)} {...props} />
  ),
  ul: ({ className, ...props }: React.ComponentProps<"ul">) => (
    <ul className={cn("my-6 ml-6 list-disc", className)} {...props} />
  ),
  ol: ({ className, ...props }: React.ComponentProps<"ol">) => (
    <ol className={cn("my-6 ml-6 list-decimal", className)} {...props} />
  ),
  li: ({ className, ...props }: React.ComponentProps<"li">) => (
    <li className={cn("mt-2", className)} {...props} />
  ),
  blockquote: ({ className, ...props }: React.ComponentProps<"blockquote">) => (
    <blockquote
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    />
  ),
  img: ({ className, alt, ...props }: React.ComponentProps<"img">) => (
    <img alt={alt} className={cn("rounded-md", className)} {...props} />
  ),
  hr: ({ ...props }: React.ComponentProps<"hr">) => (
    <hr className="my-4 md:my-8" {...props} />
  ),
  table: ({ className, ...props }: React.ComponentProps<"table">) => (
    <div className="no-scrollbar my-6 w-full overflow-y-auto rounded-xl border">
      <table
        className={cn(
          "relative w-full overflow-hidden border-none text-sm [&_tbody_tr:last-child]:border-b-0",
          className
        )}
        {...props}
      />
    </div>
  ),
  tr: ({ className, ...props }: React.ComponentProps<"tr">) => (
    <tr className={cn("m-0 border-b", className)} {...props} />
  ),
  th: ({ className, ...props }: React.ComponentProps<"th">) => (
    <th
      className={cn(
        "px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.ComponentProps<"td">) => (
    <td
      className={cn(
        "whitespace-nowrap px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, children, ...props }: React.ComponentProps<"pre">) => {
    return (
      <pre
        className={cn(
          "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-y-auto overscroll-x-contain px-4 py-3.5 outline-none has-[[data-slot=tabs]]:p-0 has-[[data-highlighted-line]]:px-0 has-[[data-line-numbers]]:px-0",
          className
        )}
        {...props}
      >
        {children}
      </pre>
    );
  },
  figure: ({ className, ...props }: React.ComponentProps<"figure">) => {
    return <figure className={cn(className)} {...props} />;
  },
  figcaption: ({
    className,
    children,
    ...props
  }: React.ComponentProps<"figcaption">) => {
    const iconExtension =
      "data-language" in props && typeof props["data-language"] === "string"
        ? getIconForLanguageExtension(props["data-language"])
        : null;

    return (
      <figcaption
        className={cn(
          "flex items-center gap-2 text-code-foreground [&_svg]:size-4 [&_svg]:text-code-foreground [&_svg]:opacity-70",
          className
        )}
        {...props}
      >
        {iconExtension}
        {children}
      </figcaption>
    );
  },
  code: ({
    className,
    __raw__,
    __src__,
    __npm__,
    __yarn__,
    __pnpm__,
    __bun__,
    ...props
  }: React.ComponentProps<"code"> & {
    __raw__?: string;
    __src__?: string;
    __npm__?: string;
    __yarn__?: string;
    __pnpm__?: string;
    __bun__?: string;
  }) => {
    // Inline Code.
    if (typeof props.children === "string") {
      return (
        <code
          className={cn(
            "relative break-words rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] outline-none",
            className
          )}
          {...props}
        />
      );
    }

    // npm command.
    const isNpmCommand = __npm__ && __yarn__ && __pnpm__ && __bun__;
    if (isNpmCommand) {
      return (
        <CodeBlockCommand
          __bun__={__bun__}
          __npm__={__npm__}
          __pnpm__={__pnpm__}
          __yarn__={__yarn__}
        />
      );
    }

    // Default codeblock.
    return (
      <>
        {__raw__ && <CopyButton src={__src__} value={__raw__} />}
        <code {...props} />
      </>
    );
  },
  Step: ({ className, ...props }: React.ComponentProps<"h3">) => (
    <h3
      className={cn(
        "mt-8 scroll-m-32 font-heading font-medium text-lg tracking-tight",
        className
      )}
      {...props}
    />
  ),
  Steps: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div
      className={cn(
        "steps [&>h3]:step mb-12 [counter-reset:step] md:ml-4 md:border-l md:pl-8",
        className
      )}
      {...props}
    />
  ),
  Image: ({
    src,
    className,
    width,
    height,
    alt,
    ...props
  }: React.ComponentProps<"img">) => (
    <Image
      alt={alt || ""}
      className={cn("mt-6 rounded-md border", className)}
      height={Number(height)}
      src={(src as string) || ""}
      width={Number(width)}
      {...props}
    />
  ),
  Tabs: ({
    className,
    ...props
  }: Omit<React.ComponentProps<typeof Tabs>, "className"> & {
    className?: string;
  }) => {
    return (
      <Tabs className={cn("relative mt-6 w-full", className)} {...props} />
    );
  },
  TabsList: ({
    className,
    ...props
  }: Omit<React.ComponentProps<typeof TabsList>, "className"> & {
    className?: string;
  }) => (
    <TabsList
      className={cn(
        "justify-start gap-4 rounded-none bg-transparent px-0",
        className
      )}
      {...props}
    />
  ),
  TabsTrigger: ({
    className,
    ...props
  }: Omit<React.ComponentProps<typeof TabsTrigger>, "className"> & {
    className?: string;
  }) => (
    <TabsTrigger
      className={cn(
        "rounded-none border-0 border-transparent border-b-2 bg-transparent px-0 pb-3 text-base text-muted-foreground hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none! dark:data-[state=active]:border-primary dark:data-[state=active]:bg-transparent",
        className
      )}
      {...props}
    />
  ),
  TabsContent: ({
    className,
    ...props
  }: Omit<React.ComponentProps<typeof TabsContent>, "className"> & {
    className?: string;
  }) => (
    <TabsContent
      className={cn(
        "relative [&>.steps]:mt-6 [&_h3.font-heading]:font-medium [&_h3.font-heading]:text-base *:[figure]:first:mt-0",
        className
      )}
      {...props}
    />
  ),
  Tab: ({ className, ...props }: React.ComponentProps<"div">) => (
    <div className={cn(className)} {...props} />
  ),
  Button,
  Callout,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertTitle,
  AlertDescription,
  AspectRatio,
  CodeTabs,
  ComponentPreview,
  ComponentSource,
  CodeCollapsibleWrapper,
  InstallCommand,
  Link: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn("font-medium underline underline-offset-4", className)}
      {...props}
    />
  ),
  LinkedCard: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn(
        "flex w-full flex-col items-center rounded-xl bg-surface p-6 text-surface-foreground transition-colors hover:bg-surface/80 sm:p-10",
        className
      )}
      {...props}
    />
  ),
  Kbd,
};

// Fumadocs integration - getMDXComponents merges our custom components with fumadocs defaults
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...mdxComponents,
    ...components,
  };
}
