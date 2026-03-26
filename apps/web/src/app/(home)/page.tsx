import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { env } from "@/lib/env";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="layout-gutter-b px-4 sm:px-8 lg:px-24">
        <div className="layout-gutter-x mx-auto py-16 text-center lg:py-24">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-secondary/50 px-3 py-1 text-fd-muted-foreground text-xs">
              <Logo className="size-3" />
              shadcn/ui component registry
            </span>

            <h1
              className={`${bricolage.className} mt-8 text-balance font-semibold text-3xl leading-[1.1] tracking-[-0.03em] sm:text-5xl lg:text-6xl`}
            >
              Production-Grade Patterns for Scaled Apps
            </h1>

            <p className="mt-6 text-balance text-base text-fd-muted-foreground leading-relaxed sm:text-lg">
              Opinionated blocks built on purpose-driven libraries. Strong
              conventions, real-world tested, one install away.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground text-sm shadow-sm transition-all hover:bg-fd-primary/90 hover:shadow-md"
                href="/docs"
              >
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground"
                href="https://github.com"
              >
                <Github className="size-4" />
                GitHub
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* Playground */}
          <div className="mt-12 flex min-h-80 items-center justify-center rounded-xl border border-fd-border border-dashed bg-fd-secondary/30 text-fd-muted-foreground text-sm">
            Component playground coming soon
          </div>
          <p className="mt-3 text-left text-fd-muted-foreground text-xs">
            Interactive demo of the layering pattern — dialog stacking, panel
            orchestration, and overlay conflict resolution.
          </p>
        </div>
      </section>

      {/* Sponsors */}
      <section className="layout-gutter-b px-4 sm:px-8 lg:px-24">
        <div className="layout-gutter-x mx-auto py-16 lg:py-24">
          <h2 className="font-semibold text-2xl tracking-[-0.02em] sm:text-3xl">
            Sponsors
          </h2>
          <p className="mt-4 max-w-xl text-base text-fd-muted-foreground leading-relaxed">
            This project is still in its early days. If you believe in what
            we&apos;re building and want to support it from the start, you can
            become a sponsor.
          </p>

          <div className="mt-10">
            <Link
              className="inline-flex items-center gap-2 text-fd-muted-foreground text-sm transition-colors hover:text-fd-foreground"
              href={`mailto:${env.contactEmail}`}
            >
              Become a sponsor
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
