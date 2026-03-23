import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Copy,
  Github,
  Terminal,
} from "lucide-react";
import Link from "next/link";

export default function V1Page() {
  return (
    <div className="flex flex-col">
      {/* Hero — two columns */}
      <section className="grid items-center gap-12 px-6 pt-28 pb-20 sm:px-12 lg:grid-cols-2 lg:px-24">
        {/* Left — text */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-3 text-fd-muted-foreground text-sm">
            <Blocks className="size-4" />
            <span>shadcn/ui component registry</span>
            <span className="text-fd-border">|</span>
            <span>open source</span>
          </div>

          <h1 className="mt-8 font-bold text-6xl leading-[1.05] tracking-tighter sm:text-7xl lg:text-8xl">
            Meticulously
            <br />
            Crafted
            <br />
            Elements
          </h1>

          <p className="mt-8 max-w-lg text-fd-muted-foreground text-lg leading-relaxed">
            Enhanced components, primitives, and patterns for your next project.
            Install with one command, customize everything.
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground text-sm transition-colors hover:bg-fd-primary/90"
              href="/docs"
            >
              Documentation
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

        {/* Right — asset placeholder */}
        <div className="flex items-center justify-center">
          <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-2xl border border-fd-border border-dashed bg-fd-secondary/30 text-fd-muted-foreground text-sm">
            Asset placeholder
          </div>
        </div>
      </section>

      {/* Quick install */}
      <section className="border-fd-border border-y bg-fd-card/50 px-6 py-8 sm:px-12 lg:px-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Terminal className="size-4 text-fd-muted-foreground" />
            <span className="text-fd-muted-foreground">Quick start</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="select-none text-fd-muted-foreground">$</span>
            <code>pnpm dlx shadcn@latest add &lt;registry-url&gt;</code>
            <Copy className="size-4 cursor-pointer text-fd-muted-foreground transition-colors hover:text-fd-foreground" />
          </div>
        </div>
      </section>
    </div>
  );
}
