import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: { accent: "var(--color-accent-library)", Icon: Info },
  tip: { accent: "var(--color-accent-kit)", Icon: Lightbulb },
  warning: { accent: "var(--color-accent-ui)", Icon: TriangleAlert },
} as const;

interface CalloutProps {
  children: ReactNode;
  className?: string;
  title?: string;
  type?: keyof typeof tones;
}

export function Callout({
  children,
  className,
  title,
  type = "info",
}: CalloutProps) {
  const { accent, Icon } = tones[type];
  const style = {
    "--callout": accent,
    background:
      "linear-gradient(to right, color-mix(in oklch, var(--callout) 9%, transparent), transparent 70%)",
  } as CSSProperties;

  return (
    <aside
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-xl border border-[color-mix(in_oklch,var(--callout)_30%,var(--color-border))] py-3.5 pr-4 pl-4 text-sm",
        className
      )}
      style={style}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0.5 bg-[var(--callout)]"
      />
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--callout)_16%,transparent)] text-[var(--callout)]"
      >
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <div className="flex min-w-0 flex-col gap-1 pt-0.5 leading-relaxed [&_p]:m-0">
        {title ? (
          <span className="font-medium text-foreground">{title}</span>
        ) : null}
        {children}
      </div>
    </aside>
  );
}
