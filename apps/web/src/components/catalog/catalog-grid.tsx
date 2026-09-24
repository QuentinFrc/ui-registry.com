import Link from "next/link";
import { Bounds } from "@/components/bounds";
import { CatalogItem } from "@/components/catalog/catalog-item";
import { type CatalogEntry, type CatalogKind, LANE_META } from "@/lib/catalog";
import { siteConfig } from "@/lib/site.config";

interface CatalogGridProps {
  emptyKind?: CatalogKind;
  entries: readonly CatalogEntry[];
}

export function CatalogGrid({ entries, emptyKind }: CatalogGridProps) {
  if (entries.length === 0 && emptyKind) {
    const lane = LANE_META[emptyKind];
    const githubHref = `https://github.com/${siteConfig.github.user}/${siteConfig.github.repo}`;
    return (
      <Bounds>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <span className="text-foreground">{lane.emptyCopy}</span> Follow along
          on{" "}
          <Link
            className="text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:decoration-solid"
            href={githubHref}
            rel="noopener"
            target="_blank"
          >
            GitHub
          </Link>{" "}
          to see the first drops.
        </p>
      </Bounds>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
      {entries.map((entry) => (
        <CatalogItem entry={entry} key={entry.slug} />
      ))}
    </div>
  );
}
