import Link from "next/link";
import type { CSSProperties } from "react";
import { PagesFan } from "@/components/pdf/pages-fan";
import { cn } from "@/lib/cn";
import { PDF_BLOCKS_BASE, pdfBlocks } from "@/lib/pdf-docs";

// Back left, back right, front.
const FAN = ["resume", "invoice", "report"].map(
  (name) => `/previews/pdf/${name}-1.png`
);

// Dotted grid in the UI lane accent, fading out towards the text.
const DOTS: CSSProperties = {
  backgroundImage:
    "radial-gradient(color-mix(in oklch, var(--color-accent-ui) 35%, transparent) 1px, transparent 1px)",
  backgroundSize: "14px 14px",
  maskImage: "linear-gradient(to left, black 30%, transparent 85%)",
};

const GLOW: CSSProperties = {
  background:
    "radial-gradient(60% 80% at 85% 30%, color-mix(in oklch, var(--color-accent-ui) 22%, transparent), transparent 70%)",
};

const Eyebrow = ({ count = true }: { count?: boolean }) => (
  <span className="flex items-center gap-2 font-medium font-mono text-[11px] uppercase tracking-[0.16em]">
    <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-ui" />
    <span className="text-accent-ui">PDF blocks</span>
    {count ? (
      <span className="text-muted-foreground">
        · {pdfBlocks.length} documents
      </span>
    ) : null}
  </span>
);

interface BlocksCalloutProps {
  className?: string;
  description?: string;
  title?: string;
}

/** Visual link from the library docs to the PDF blocks. */
export function BlocksCallout({
  className,
  description = "Typed data in, finished document out. Install a block with the shadcn CLI and own the code.",
  title = "Need a complete document?",
}: BlocksCalloutProps) {
  return (
    <Link
      className={cn(
        "not-prose group relative isolate grid overflow-hidden rounded-xl border bg-muted/30 transition-colors hover:border-accent-ui/50 sm:grid-cols-[minmax(0,1fr)_15rem]",
        className
      )}
      href={PDF_BLOCKS_BASE}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={GLOW}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={DOTS}
      />

      <span className="flex flex-col gap-3 p-5 sm:p-6">
        <Eyebrow />
        <span className="font-semibold text-foreground text-lg leading-snug tracking-tight">
          {title}
        </span>
        <span className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {pdfBlocks.map((block) => (
            <span
              className="rounded-full border bg-background/70 px-2.5 py-0.5 text-foreground text-xs backdrop-blur"
              key={block.name}
            >
              {block.title}
            </span>
          ))}
        </span>
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 font-medium text-background text-xs transition-transform group-hover:translate-x-0.5">
          Browse the blocks
          <span aria-hidden="true">→</span>
        </span>
      </span>

      <PagesFan
        alt="Report, invoice and resume PDF blocks"
        className="order-first h-44 sm:order-none sm:h-auto"
        pageClassName="top-[14%] w-[30%] sm:top-[16%] sm:w-[44%]"
        srcs={FAN}
      />
    </Link>
  );
}

/** Small version for the docs side column. */
export function BlocksCalloutCompact() {
  return (
    <Link
      className="group relative isolate flex flex-col overflow-hidden rounded-xl border bg-muted/30 transition-colors hover:border-accent-ui/50"
      href={PDF_BLOCKS_BASE}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={GLOW}
      />
      <PagesFan
        alt="PDF blocks"
        className="h-28 border-b"
        pageClassName="top-[16%] w-[34%]"
        srcs={FAN}
      />
      <span className="flex flex-col gap-1.5 p-4">
        <Eyebrow count={false} />
        <span className="font-medium text-foreground text-sm leading-snug">
          {pdfBlocks.length} ready-made documents
        </span>
        <span className="font-medium text-foreground text-xs">
          Browse the blocks{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </span>
    </Link>
  );
}
