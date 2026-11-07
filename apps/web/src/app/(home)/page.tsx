import Link from "next/link";
import { Bounds } from "@/components/bounds";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { Logo } from "@/components/logo";
import {
  type CatalogKind,
  catalog,
  catalogByKind,
  LANE_META,
} from "@/lib/catalog";
import { kitComponents } from "@/lib/kit";
import { siteConfig } from "@/lib/site.config";

interface LaneLinkProps {
  count: string;
  kind: CatalogKind;
}

const LaneLink = ({ kind, count }: LaneLinkProps) => {
  const lane = LANE_META[kind];
  return (
    <Link
      className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      href={lane.href}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: lane.accent }}
      />
      Browse {lane.label}
      <span className="text-muted-foreground/60">· {count}</span>
      <span
        aria-hidden="true"
        className="translate-x-0 opacity-60 transition-transform group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
};

export default function HomePage() {
  const kitCount = kitComponents().length;
  const uiCount = catalogByKind("ui").length;
  const libraryCount = catalogByKind("library").length;

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
          <nav className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[13px]">
            <LaneLink count={String(kitCount)} kind="kit" />
            <LaneLink count={String(uiCount)} kind="ui" />
            <LaneLink count={String(libraryCount)} kind="library" />
          </nav>
        </header>
      </Bounds>

      <CatalogGrid entries={catalog} />

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
