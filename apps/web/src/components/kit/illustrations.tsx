import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Schematic illustrations for kit cards. Wireframes, not screenshots: just
 * enough to tell a dialog from a sheet — header, content, footer.
 */

const Stage = ({ children }: { children: ReactNode }) => (
  <div
    aria-hidden="true"
    className="relative h-full w-full overflow-hidden bg-background"
    style={{
      backgroundImage:
        "radial-gradient(color-mix(in oklch, var(--color-foreground) 8%, transparent) 1px, transparent 1px)",
      backgroundSize: "14px 14px",
    }}
  >
    {children}
  </div>
);

/** Faint page content behind an overlay. */
const PageLines = () => (
  <div className="absolute inset-0 flex flex-col gap-2 p-6 opacity-50">
    <div className="h-2 w-1/3 rounded-full bg-foreground/15" />
    <div className="h-1.5 w-full rounded-full bg-foreground/10" />
    <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
    <div className="h-1.5 w-2/3 rounded-full bg-foreground/10" />
    <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/10" />
    <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
  </div>
);

const Overlay = () => (
  <div className="absolute inset-0 bg-foreground/5 backdrop-blur-[1px]" />
);

const Line = ({ className }: { className?: string }) => (
  <div className={cn("h-1.5 rounded-full bg-foreground/15", className)} />
);

const Pill = ({ filled }: { filled?: boolean }) => (
  <div
    className={cn(
      "h-3.5 w-9 rounded-md",
      filled ? "bg-foreground/80" : "border border-foreground/20 bg-background"
    )}
  />
);

/** Header / content / footer panel. */
const Panel = ({
  className,
  style,
  muted,
}: {
  className?: string;
  muted?: boolean;
  style?: React.CSSProperties;
}) => (
  <div
    className={cn(
      "absolute grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-foreground/10 bg-background shadow-lg",
      muted && "opacity-70",
      className
    )}
    style={style}
  >
    <div className="flex items-center justify-between px-3 pt-3 pb-2">
      <Line className="h-2 w-16 bg-foreground/40" />
      <div className="size-2 rounded-full bg-foreground/20" />
    </div>
    <div className="relative flex min-h-0 flex-col gap-1.5 overflow-hidden px-3 py-1">
      <Line className="w-full" />
      <Line className="w-5/6" />
      <Line className="w-full" />
      <Line className="w-2/3" />
      <Line className="w-full" />
      <Line className="w-4/5" />
      <div className="absolute top-1 right-1 h-5 w-[3px] rounded-full bg-foreground/20" />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background to-transparent" />
    </div>
    <div className="flex justify-end gap-1.5 border-foreground/10 border-t bg-muted/60 px-3 py-2">
      <Pill />
      <Pill filled />
    </div>
  </div>
);

const DialogIllustration = () => (
  <Stage>
    <PageLines />
    <Overlay />
    <Panel
      className="left-1/2 h-[64%] w-[54%] -translate-x-1/2"
      muted
      style={{ top: "12%", scale: "0.92", transformOrigin: "top" }}
    />
    <Panel className="top-[22%] left-1/2 h-[68%] w-[58%] -translate-x-1/2" />
  </Stage>
);

const SheetIllustration = () => (
  <Stage>
    <PageLines />
    <Overlay />
    <Panel
      className="top-0 right-[18%] h-full w-[44%] rounded-none border-y-0 border-r-0"
      muted
    />
    <Panel className="top-0 right-0 h-full w-[46%] rounded-none border-y-0 border-r-0" />
  </Stage>
);

const FallbackIllustration = () => (
  <Stage>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-[40%] w-[50%] flex-col justify-center gap-2 rounded-lg border border-foreground/20 border-dashed p-4">
        <Line className="w-1/2 bg-foreground/30" />
        <Line className="w-full" />
        <Line className="w-3/4" />
      </div>
    </div>
  </Stage>
);

const ILLUSTRATIONS: Record<string, ComponentType> = {
  dialog: DialogIllustration,
  sheet: SheetIllustration,
};

export const kitIllustration = (name: string): ComponentType =>
  ILLUSTRATIONS[name] ?? FallbackIllustration;
