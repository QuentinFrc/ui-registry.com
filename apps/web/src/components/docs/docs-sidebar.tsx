"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface DocsNavLink {
  href: string;
  title: string;
}

export interface DocsNavSection {
  links: readonly DocsNavLink[];
  title: string;
}

interface DocsSidebarProps {
  label: string;
  sections: readonly DocsNavSection[];
}

const NavSections = ({ sections }: Pick<DocsSidebarProps, "sections">) => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-7">
      {sections.map((section) => (
        <div className="flex flex-col gap-2" key={section.title}>
          <h4 className="px-2.5 font-semibold text-foreground text-xs">
            {section.title}
          </h4>
          <ul className="flex flex-col gap-px">
            {section.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center rounded-md px-2.5 text-[13px] transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
export function DocsSidebar({ label, sections }: DocsSidebarProps) {
  const pathname = usePathname();
  const current = sections
    .flatMap((section) => section.links)
    .find((link) => link.href === pathname);

  return (
    <>
      <details className="group rounded-lg border lg:hidden">
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
        <nav aria-label={label} className="border-t p-2 pt-4">
          <NavSections sections={sections} />
        </nav>
      </details>

      <nav
        aria-label={label}
        className="sticky top-8 -ml-2.5 hidden max-h-[calc(100vh-4rem)] overflow-y-auto pb-8 lg:block"
      >
        <NavSections sections={sections} />
      </nav>
    </>
  );
}
