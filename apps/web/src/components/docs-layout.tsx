import Link from "next/link";
import type { ReactNode } from "react";
import { DocsShell } from "@/components/docs/docs-shell";

interface DocsLayoutProps {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}

/** Single-page docs (kit components, small packages): no left sidebar. */
export function DocsLayout({ backHref, backLabel, children }: DocsLayoutProps) {
  return (
    <DocsShell
      header={
        <Link
          className="w-fit text-muted-foreground text-sm hover:text-foreground"
          href={backHref}
        >
          ← {backLabel}
        </Link>
      }
    >
      {children}
    </DocsShell>
  );
}
