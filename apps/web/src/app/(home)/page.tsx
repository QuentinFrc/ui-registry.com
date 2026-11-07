import Link from "next/link";
import { Bounds } from "@/components/bounds";
import { Logo } from "@/components/logo";
import { PatternCard } from "@/components/patterns/pattern-card";
import { patterns } from "@/lib/patterns";
import { siteConfig } from "@/lib/site.config";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
      <Bounds>
        <header className="flex flex-col gap-6">
          <Logo className="size-8" />
          <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
            {siteConfig.name}
          </h1>
          <p className="text-balance text-lg text-muted-foreground leading-relaxed">
            {siteConfig.description}
          </p>
        </header>
      </Bounds>

      <section
        aria-label="Patterns"
        className="grid grid-cols-1 sm:grid-cols-2"
      >
        {patterns.map((pattern) => (
          <PatternCard key={pattern.slug} pattern={pattern} />
        ))}
      </section>

      <Bounds>
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
      </Bounds>
    </main>
  );
}
