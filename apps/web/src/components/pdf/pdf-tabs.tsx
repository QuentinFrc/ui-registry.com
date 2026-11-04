"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PDF_BLOCKS_BASE, PDF_DOCS_BASE } from "@/lib/pdf-docs";

const TABS = [
  { href: PDF_DOCS_BASE, label: "Library" },
  { href: PDF_BLOCKS_BASE, label: "Blocks" },
] as const;

/** Switches between the PDF library docs and the PDF blocks. */
export function PdfTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b">
      <div className="flex items-baseline gap-3 pb-3">
        <span className="font-mono text-sm">@ui-registries/pdf</span>
      </div>
      <nav aria-label="PDF sections" className="-mb-px flex gap-6">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "border-b-2 pb-3 font-medium text-sm transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
