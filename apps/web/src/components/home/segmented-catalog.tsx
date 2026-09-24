"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CatalogEntry, CatalogKind } from "@/lib/catalog";
import { siteConfig } from "@/lib/site.config";

interface Segment {
  description: string;
  kind: CatalogKind;
  label: string;
}

const SEGMENTS: readonly Segment[] = [
  {
    kind: "ui",
    label: "UI",
    description: "Components, blocks, patterns — copy in via the shadcn CLI.",
  },
  {
    kind: "library",
    label: "Libraries",
    description: "Headless primitives — install as a package.",
  },
] as const;

const tabId = (kind: CatalogKind) => `catalog-tab-${kind}`;
const panelId = (kind: CatalogKind) => `catalog-panel-${kind}`;

interface IndicatorRect {
  left: number;
  width: number;
}

const useIndicator = (
  listRef: React.RefObject<HTMLDivElement | null>,
  activeIndex: number
) => {
  const [rect, setRect] = useState<IndicatorRect | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const measure = () => {
      const tabs = list.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      const active = tabs[activeIndex];
      if (!active) {
        return;
      }
      const listRect = list.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      setRect({
        left: activeRect.left - listRect.left,
        width: activeRect.width,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const tab of list.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]'
    )) {
      observer.observe(tab);
    }

    return () => observer.disconnect();
  }, [listRef, activeIndex]);

  return rect;
};

const usePrefersReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(media.matches);
    const listener = (event: MediaQueryListEvent) =>
      setPrefersReduced(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
};

interface CatalogItemProps {
  entry: CatalogEntry;
}

const CatalogItem = ({ entry }: CatalogItemProps) => {
  const accentVar =
    entry.kind === "ui"
      ? "var(--color-accent-ui)"
      : "var(--color-accent-library)";

  return (
    <li>
      <Link
        className="group flex flex-col gap-1 border-transparent border-l-2 py-4 pl-4 transition-colors hover:text-foreground"
        href={entry.href}
        style={{ borderLeftColor: accentVar }}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium font-mono text-sm">{entry.name}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
            {entry.status}
          </span>
        </div>
        <span className="text-muted-foreground text-sm leading-relaxed">
          {entry.tagline}
        </span>
      </Link>
    </li>
  );
};

const UiEmptyState = () => (
  <div
    className="flex flex-col gap-2 rounded-lg border border-border border-dashed p-6"
    style={{ borderColor: "var(--color-accent-ui)" }}
  >
    <p className="font-medium text-foreground text-sm">In development</p>
    <p className="text-muted-foreground text-sm leading-relaxed">
      The first blocks land soon — opinionated shadcn-compatible UI extracted
      from real engagements.{" "}
      <Link
        className="text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:decoration-solid"
        href={`https://github.com/${siteConfig.github.user}/${siteConfig.github.repo}`}
        rel="noopener"
        target="_blank"
      >
        Follow on GitHub
      </Link>
      .
    </p>
  </div>
);

const renderPanelBody = (
  kind: CatalogKind,
  entries: readonly CatalogEntry[]
) => {
  if (entries.length > 0) {
    return (
      <ul className="flex flex-col divide-y divide-border border-border border-y">
        {entries.map((entry) => (
          <CatalogItem entry={entry} key={entry.slug} />
        ))}
      </ul>
    );
  }
  if (kind === "ui") {
    return <UiEmptyState />;
  }
  return null;
};

interface SegmentedCatalogProps {
  libraries: readonly CatalogEntry[];
  ui: readonly CatalogEntry[];
}

export function SegmentedCatalog({ ui, libraries }: SegmentedCatalogProps) {
  const [selectedKind, setSelectedKind] = useState<CatalogKind>("library");
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<CatalogKind, HTMLButtonElement | null>>({
    ui: null,
    library: null,
  });
  const activeIndex = useMemo(
    () => SEGMENTS.findIndex((segment) => segment.kind === selectedKind),
    [selectedKind]
  );
  const indicator = useIndicator(listRef, activeIndex);
  const prefersReducedMotion = usePrefersReducedMotion();

  const entriesByKind: Record<CatalogKind, readonly CatalogEntry[]> = useMemo(
    () => ({ ui, library: libraries }),
    [ui, libraries]
  );

  const focusSegment = useCallback((index: number) => {
    const segment = SEGMENTS[index];
    if (!segment) {
      return;
    }
    const button = tabRefs.current[segment.kind];
    setSelectedKind(segment.kind);
    button?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      if (key === "ArrowRight") {
        event.preventDefault();
        focusSegment((activeIndex + 1) % SEGMENTS.length);
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        focusSegment((activeIndex - 1 + SEGMENTS.length) % SEGMENTS.length);
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        focusSegment(0);
        return;
      }
      if (key === "End") {
        event.preventDefault();
        focusSegment(SEGMENTS.length - 1);
      }
    },
    [activeIndex, focusSegment]
  );

  const indicatorStyle: React.CSSProperties = indicator
    ? {
        transform: `translateX(${indicator.left}px)`,
        width: indicator.width,
        transition: prefersReducedMotion
          ? "none"
          : "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
      }
    : { opacity: 0 };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Catalog</h2>

      <div
        aria-label="Catalog"
        className="relative inline-flex self-start rounded-full border border-border bg-muted p-1"
        onKeyDown={handleKeyDown}
        ref={listRef}
        role="tablist"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 rounded-full bg-background shadow-sm ring-1 ring-border/60"
          style={indicatorStyle}
        />
        {SEGMENTS.map((segment) => {
          const selected = segment.kind === selectedKind;
          return (
            <button
              aria-controls={panelId(segment.kind)}
              aria-selected={selected}
              className="relative z-10 rounded-full px-4 py-1.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[selected=false]:text-muted-foreground data-[selected=true]:text-foreground data-[selected=false]:hover:text-foreground"
              data-selected={selected}
              id={tabId(segment.kind)}
              key={segment.kind}
              onClick={() => setSelectedKind(segment.kind)}
              ref={(node) => {
                tabRefs.current[segment.kind] = node;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {segment.label}
            </button>
          );
        })}
      </div>

      {SEGMENTS.map((segment) => {
        const selected = segment.kind === selectedKind;
        const entries = entriesByKind[segment.kind];
        return (
          <section
            aria-labelledby={tabId(segment.kind)}
            className="data-[reduced=false]:motion-safe:fade-in-0 flex flex-col gap-4 data-[reduced=false]:motion-safe:animate-in data-[reduced=false]:motion-safe:duration-200"
            data-reduced={prefersReducedMotion}
            hidden={!selected}
            id={panelId(segment.kind)}
            key={segment.kind}
            role="tabpanel"
          >
            <p className="text-muted-foreground text-sm leading-relaxed">
              {segment.description}
            </p>

            {renderPanelBody(segment.kind, entries)}
          </section>
        );
      })}
    </div>
  );
}
