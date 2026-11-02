"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { PdfDocsSection } from "@/lib/pdf-docs";

interface PdfDocsNavProps {
  sections: readonly PdfDocsSection[];
}

const NavSections = ({ sections }: PdfDocsNavProps) => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <div className="flex flex-col gap-1.5" key={section.title}>
          <span className="font-medium font-mono text-[11px] text-muted-foreground/80 uppercase tracking-[0.14em]">
            {section.title}
          </span>
          <ul className="flex flex-col">
            {section.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-ml-px block border-l py-1 pl-3 text-sm transition-colors",
                      active
                        ? "border-foreground font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                    href={link.href}
                  >
                    {link.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

/** Sticky sidebar on desktop, collapsible menu on small screens. */
export function PdfDocsSidebar({ sections }: PdfDocsNavProps) {
  const pathname = usePathname();
  const current = sections
    .flatMap((section) => section.links)
    .find((link) => link.href === pathname);

  return (
    <>
      <details className="group rounded-md border lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Menu
            {current ? (
              <span className="text-foreground"> / {current.title}</span>
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <nav aria-label="PDF documentation" className="border-t px-4 py-4">
          <NavSections sections={sections} />
        </nav>
      </details>

      <nav
        aria-label="PDF documentation"
        className="sticky top-8 hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-l pr-2 pb-8 lg:block"
      >
        <NavSections sections={sections} />
      </nav>
    </>
  );
}
