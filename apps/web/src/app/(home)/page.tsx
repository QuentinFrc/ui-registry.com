import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site.config";

const packages = [
  {
    slug: "flash",
    name: "@ui-registry/flash",
    tagline:
      "Encode flash messages in the URL so they survive a redirect — Rails-style.",
    status: "alpha",
  },
] as const;

export default function HomePage() {
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

      <section className="flex flex-col gap-4">
        <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
          Packages
        </h2>
        <ul className="flex flex-col divide-y divide-border border-border border-y">
          {packages.map((pkg) => (
            <li key={pkg.slug}>
              <Link
                className="flex flex-col gap-1 py-4 transition-colors hover:text-foreground"
                href={`/packages/${pkg.slug}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium font-mono text-sm">
                    {pkg.name}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                    {pkg.status}
                  </span>
                </div>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  {pkg.tagline}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
