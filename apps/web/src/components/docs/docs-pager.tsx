"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface PagerLink {
  href: string;
  title: string;
}

interface DocsPagerProps {
  /** Every page of the section, in reading order. */
  links: readonly PagerLink[];
}

// Previous / next page from the flattened navigation, like shadcn's docs.
export function DocsPager({ links }: DocsPagerProps) {
  const pathname = usePathname();
  const index = links.findIndex((link) => link.href === pathname);
  if (index === -1) {
    return null;
  }
  const previous = links[index - 1];
  const next = links[index + 1];

  return (
    <nav
      aria-label="Pagination"
      className="not-prose mt-10 grid grid-cols-2 gap-4 border-t pt-6"
    >
      {previous ? (
        <Link
          className="group flex flex-col gap-1 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/60"
          href={previous.href}
        >
          <span className="text-muted-foreground text-xs">← Previous</span>
          <span className="font-medium text-foreground text-sm">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          className="group flex flex-col items-end gap-1 rounded-lg border px-4 py-3 text-right transition-colors hover:bg-muted/60"
          href={next.href}
        >
          <span className="text-muted-foreground text-xs">Next →</span>
          <span className="font-medium text-foreground text-sm">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
