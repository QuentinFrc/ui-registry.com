import Link from "next/link";
import { MediaPreview } from "@/components/catalog/catalog-item";
import type { Pattern } from "@/lib/patterns";

const PLACEHOLDER_ACCENT = "var(--color-accent-library)";

interface PatternCardProps {
  pattern: Pattern;
}

// The whole card links to the pattern (stretched link on the title).
export function PatternCard({ pattern }: PatternCardProps) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <MediaPreview accent={PLACEHOLDER_ACCENT} entry={pattern} />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-balance font-medium text-lg leading-snug tracking-tight">
            <Link
              className="after:absolute after:inset-0 after:content-['']"
              href={pattern.href}
            >
              {pattern.title}
            </Link>
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-muted-foreground/70 tracking-widest">
            <span className="uppercase">{pattern.status}</span>
            <span aria-hidden="true">·</span>
            <span>v{pattern.version}</span>
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
