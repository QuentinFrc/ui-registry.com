import Link from "next/link";
import { Bounds } from "@/components/bounds";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { LaneIntro } from "@/components/catalog/lane-intro";
import { catalogByKind } from "@/lib/catalog";

export default function LibrariesLanePage() {
  const entries = catalogByKind("library");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
      <Bounds>
        <Link
          className="w-fit font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          href="/"
        >
          ← Home
        </Link>
      </Bounds>

      <Bounds>
        <LaneIntro kind="library" />
      </Bounds>

      <CatalogGrid emptyKind="library" entries={entries} />
    </main>
  );
}
