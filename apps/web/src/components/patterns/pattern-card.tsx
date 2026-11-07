import Link from "next/link";
import { MediaPreview } from "@/components/catalog/catalog-item";
import { TourIllustration } from "@/components/patterns/tour-illustration";
import type { Pattern } from "@/lib/patterns";

/** Patterns drawn in markup rather than shown as a captured preview. */
const ILLUSTRATIONS: Record<string, () => React.JSX.Element> = {
  guide: TourIllustration,
};

const PLACEHOLDER_ACCENT = "var(--color-accent-library)";

interface PatternCardProps {
  pattern: Pattern;
}

// The whole card links to the pattern (stretched link on the title).
export function PatternCard({ pattern }: PatternCardProps) {
  const Illustration = ILLUSTRATIONS[pattern.slug];

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden bg-muted transition-colors duration-300 group-hover:bg-muted/60">
        {Illustration ? (
          <Illustration />
        ) : (
          <MediaPreview accent={PLACEHOLDER_ACCENT} entry={pattern} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-balance font-medium text-lg leading-snug tracking-tight">
            <Link
              className="after:absolute after:inset-0 after:content-['']"
              href={pattern.href}
            >
              {pattern.title}
              <span
                aria-hidden="true"
                className="ml-1 inline-block text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
              >
                →
              </span>
            </Link>
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-muted-foreground/70 tracking-widest">
            <span>
              {pattern.version ? `v${pattern.version}` : "unreleased"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{pattern.name}</span>
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {pattern.description}
          </p>
        </div>
      </div>
    </article>
  );
}
