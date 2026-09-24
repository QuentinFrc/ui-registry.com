import Link from "next/link";
import { SegmentedCatalog } from "@/components/home/segmented-catalog";
import { Logo } from "@/components/logo";
import { catalogByKind } from "@/lib/catalog";
import { siteConfig } from "@/lib/site.config";

export default function HomePage() {
  const ui = catalogByKind("ui");
  const libraries = catalogByKind("library");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-6">
        <Logo className="size-8" />
        <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
          {siteConfig.name}
        </h1>
        <p className="text-balance text-lg text-muted-foreground leading-relaxed">
          {siteConfig.description}
        </p>
      </header>

      <SegmentedCatalog libraries={libraries} ui={ui} />

      <footer className="flex items-center gap-4 border-border border-t pt-8 text-muted-foreground text-sm">
        <Link className="hover:text-foreground" href="/about">
          About
        </Link>
        <Link
          className="hover:text-foreground"
          href={`https://github.com/${siteConfig.github.user}/${siteConfig.github.repo}`}
          rel="noopener"
          target="_blank"
        >
          GitHub
        </Link>
      </footer>
    </main>
  );
}
