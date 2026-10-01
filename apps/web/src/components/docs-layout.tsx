import Link from "next/link";
import type { ReactNode } from "react";

interface DocsLayoutProps {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}

export function DocsLayout({ backHref, backLabel, children }: DocsLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:py-16">
      <Link
        className="text-muted-foreground text-sm hover:text-foreground"
        href={backHref}
      >
        ← {backLabel}
      </Link>
      <article className="prose-content flex flex-col gap-6">
        {children}
      </article>
    </main>
  );
}
