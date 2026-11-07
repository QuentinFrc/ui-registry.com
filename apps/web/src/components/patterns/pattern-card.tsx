import Link from "next/link";
import { MediaPreview } from "@/components/catalog/catalog-item";
import type { Pattern } from "@/lib/patterns";

const PLACEHOLDER_ACCENT = "var(--color-accent-library)";

interface PatternCardProps {
  pattern: Pattern;
}

// The whole card links to the pattern (stretched link on the title); its
// parts (library, blocks…) sit above that link so each stays reachable.
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
          <p className="text-muted-foreground text-sm leading-relaxed">
            {pattern.description}
          </p>
        </div>

        <ul className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
          {pattern.parts.map((part) => (
            <li key={part.kind}>
              <Link
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                href={part.href}
              >
                <span className="text-muted-foreground/70">{part.kind}</span>
                <span>{part.label}</span>
              </Link>
            </li>
          ))}
          <li className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest">
            {pattern.status}
          </li>
        </ul>
      </div>
    </article>
  );
}
