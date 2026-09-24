import Image from "next/image";
import Link from "next/link";
import { type CatalogEntry, LANE_META } from "@/lib/catalog";

interface MediaPreviewProps {
  accent: string;
  entry: CatalogEntry;
}

const MediaPreview = ({ entry, accent }: MediaPreviewProps) => {
  if (entry.media?.kind === "video") {
    return (
      <video
        aria-label={`${entry.name} preview`}
        autoPlay
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        poster={entry.media.poster}
      >
        <source src={entry.media.src} />
      </video>
    );
  }

  if (entry.media?.kind === "image") {
    return (
      <Image
        alt={entry.media.alt}
        className="h-full w-full object-cover"
        fill
        sizes="(min-width: 1024px) 560px, (min-width: 640px) 45vw, 100vw"
        src={entry.media.src}
      />
    );
  }

  return <CodePreviewPlaceholder accent={accent} entry={entry} />;
};

interface CodePreviewProps {
  accent: string;
  entry: CatalogEntry;
}

const CodePreviewPlaceholder = ({ accent, entry }: CodePreviewProps) => (
  <div
    aria-hidden="true"
    className="flex h-full w-full items-center justify-center p-5 sm:p-7"
    style={{
      backgroundColor: "#0a0a0a",
      backgroundImage: `radial-gradient(color-mix(in oklch, ${accent} 22%, transparent) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)`,
      backgroundSize: "14px 14px, 100% 100%",
      backgroundPosition: "0 0, 0 0",
    }}
  >
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-neutral-800/80 bg-neutral-900 shadow-2xl">
      <div className="flex items-center justify-between border-neutral-800/70 border-b px-3 py-1.5 font-mono text-[10px]">
        <span className="truncate text-neutral-500">{entry.name}.ts</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded bg-neutral-800/70 px-1.5 py-0.5 text-neutral-400">
            ver 0.1
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-medium text-neutral-950"
            style={{ background: accent }}
          >
            Commit
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-3 py-2 font-mono text-[10px] leading-[1.9]">
        <CodeLine n={1}>
          <span className="text-neutral-500">
            # {entry.slug} · {entry.status}
          </span>
        </CodeLine>
        <CodeLine n={2}>
          <span className="text-fuchsia-400">import</span>{" "}
          <span className="text-neutral-300">{"{ "}</span>
          <span style={{ color: accent }}>{entry.slug}</span>
          <span className="text-neutral-300">{" }"}</span>{" "}
          <span className="text-fuchsia-400">from</span>{" "}
          <span className="text-emerald-400">&quot;{entry.name}&quot;</span>
        </CodeLine>
        <CodeLine n={3}>&nbsp;</CodeLine>
        <CodeLine accent={accent} highlight n={4}>
          <span className="text-fuchsia-400">const</span>{" "}
          <span className="text-cyan-300">result</span>{" "}
          <span className="text-neutral-500">=</span>{" "}
          <span style={{ color: accent }}>{entry.slug}</span>
          <span className="text-neutral-300">()</span>
        </CodeLine>
        <CodeLine n={5}>
          <span className="text-neutral-500"># preview coming soon</span>
        </CodeLine>
      </div>
    </div>
  </div>
);

interface CodeLineProps {
  accent?: string;
  children: React.ReactNode;
  highlight?: boolean;
  n: number;
}

const CodeLine = ({ children, n, highlight, accent }: CodeLineProps) => (
  <div
    className="-mx-3 flex gap-3 px-3"
    style={
      highlight && accent
        ? {
            background: `color-mix(in oklch, ${accent} 12%, transparent)`,
            boxShadow: `inset 2px 0 0 ${accent}`,
          }
        : undefined
    }
  >
    <span className="w-3 shrink-0 text-right text-neutral-700">{n}</span>
    <span className="text-neutral-300">{children}</span>
  </div>
);

interface CatalogItemProps {
  entry: CatalogEntry;
}

export function CatalogItem({ entry }: CatalogItemProps) {
  const lane = LANE_META[entry.kind];

  return (
    <Link className="group flex flex-col" href={entry.href}>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <MediaPreview accent={lane.accent} entry={entry} />
      </div>

      <div className="flex flex-col gap-1.5 px-5 pt-4 pb-8">
        <div className="flex items-baseline gap-2">
          <span className="font-medium font-mono text-xs transition-colors group-hover:text-foreground">
            {entry.name}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {entry.status}
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {entry.tagline}
        </p>
      </div>
    </Link>
  );
}
