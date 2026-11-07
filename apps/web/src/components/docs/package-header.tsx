"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface PackageTab {
  href: string;
  label: string;
}

interface PackageHeaderProps {
  name: string;
  /** Sections of the package (library docs, blocks…); none for a single one. */
  tabs?: readonly PackageTab[];
}

/** Package name and its sections, above the docs columns. */
export function PackageHeader({ name, tabs = [] }: PackageHeaderProps) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-11 flex-wrap items-end justify-between gap-4 border-b">
      <div className="flex items-baseline gap-3 pb-3">
        <span className="font-mono text-sm">{name}</span>
      </div>
      {tabs.length > 0 ? (
        <nav aria-label={`${name} sections`} className="-mb-px flex gap-6">
          {tabs.map((tab) => {
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
      ) : null}
    </div>
  );
}
