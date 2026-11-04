import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DocsPager, type PagerLink } from "./docs-pager";
import { SponsorCard } from "./sponsor-card";
import { TableOfContents } from "./toc";

interface DocsShellProps {
  /** Extra card in the right column, between the TOC and the sponsor card. */
  aside?: ReactNode;
  children: ReactNode;
  /** Breadcrumb / tabs row above the columns. */
  header: ReactNode;
  /** Pages in reading order, for the previous / next links. */
  pager?: readonly PagerLink[];
  sidebar?: ReactNode;
}

/**
 * Three-column docs layout: navigation, content, then table of contents and
 * sponsor card. Columns collapse from the outside in on smaller screens.
 */
export function DocsShell({
  aside,
  children,
  header,
  pager,
  sidebar,
}: DocsShellProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-12 sm:py-16",
        sidebar ? "max-w-7xl" : "max-w-6xl"
      )}
    >
      {header}
      <div
        className={cn(
          "grid grid-cols-1 gap-8 lg:gap-12",
          sidebar
            ? "lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_14rem]"
            : "xl:grid-cols-[minmax(0,1fr)_14rem]"
        )}
      >
        {sidebar ? <aside>{sidebar}</aside> : null}
        <div className="flex min-w-0 flex-col">
          <article
            className={cn(
              "prose-content flex min-w-0 flex-col gap-6",
              !sidebar && "mx-auto w-full max-w-3xl xl:mx-0"
            )}
            data-docs-content
          >
            {children}
          </article>
          {pager ? <DocsPager links={pager} /> : null}
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col gap-8 overflow-y-auto pb-8">
            <TableOfContents />
            {aside}
            <SponsorCard />
          </div>
        </aside>
      </div>
    </main>
  );
}
