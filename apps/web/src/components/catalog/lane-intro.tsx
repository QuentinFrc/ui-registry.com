import { type CatalogKind, LANE_META } from "@/lib/catalog";

interface LaneIntroProps {
  kind: CatalogKind;
}

export function LaneIntro({ kind }: LaneIntroProps) {
  const lane = LANE_META[kind];
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: lane.accent }}
        />
        <span
          className="font-medium font-mono text-[11px] uppercase tracking-[0.18em]"
          style={{ color: lane.accent }}
        >
          {lane.eyebrow}
        </span>
      </div>
      <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
        {lane.heading}
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        {lane.description}
      </p>
    </header>
  );
}
