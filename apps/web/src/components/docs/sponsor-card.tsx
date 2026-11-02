import { siteConfig } from "@/lib/site.config";

const { sponsor } = siteConfig;

export function SponsorCard() {
  return (
    <a
      className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-muted/40 p-4 transition-colors hover:border-foreground/20 hover:bg-muted"
      href={sponsor.href}
      rel="noopener"
      target="_blank"
    >
      <span
        aria-hidden="true"
        className="absolute -top-6 -right-6 size-20 rounded-full bg-accent-library/15 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <span className="font-medium font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
        {sponsor.eyebrow}
      </span>
      <span className="font-medium text-foreground text-sm leading-snug">
        {sponsor.title}
      </span>
      <span className="text-muted-foreground text-xs leading-relaxed">
        {sponsor.description}
      </span>
      <span className="mt-1 font-medium text-foreground text-xs">
        {sponsor.cta}{" "}
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </a>
  );
}
