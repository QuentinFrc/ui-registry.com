// A mock app window with a guide run on it: the veil with a spotlight hole on
// a button, the tour frame next to it, and a hint beacon elsewhere. Pure
// markup on theme tokens, so it follows light and dark mode.

const Bar = ({ className }: { className: string }) => (
  <span className={`block rounded-full bg-foreground/10 ${className}`} />
);

export function TourIllustration() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-[12%] top-[12%] h-full overflow-hidden rounded-t-lg border border-border bg-background shadow-2xl transition-transform duration-500 group-hover:-translate-y-1">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-border border-b px-3 py-2">
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <Bar className="ml-3 h-1.5 w-20" />
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="flex w-[22%] flex-col gap-2.5 border-border border-r p-3">
            <Bar className="h-1.5 w-3/4" />
            <Bar className="h-1.5 w-1/2" />
            <Bar className="h-1.5 w-2/3" />
            <Bar className="h-1.5 w-1/2" />
          </div>

          {/* Content */}
          <div className="relative flex flex-1 flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <Bar className="h-2 w-24" />
              {/* The spotlit target */}
              <span className="relative z-10 rounded-md bg-primary px-2.5 py-1 font-medium text-[9px] text-primary-foreground shadow-[0_0_0_4px_var(--background),0_0_0_9999px_color-mix(in_oklab,black_45%,transparent)]">
                New group
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["a", "b", "c", "d", "e", "f"].map((key) => (
                <div
                  className="flex h-12 flex-col gap-1.5 rounded-md border border-border p-2"
                  key={key}
                >
                  <Bar className="h-1.5 w-3/4" />
                  <Bar className="h-1.5 w-1/2" />
                </div>
              ))}
            </div>

            {/* Tour frame, anchored under the target */}
            <div className="absolute top-12 right-3 z-20 flex w-[46%] flex-col gap-2 rounded-lg border border-border bg-background p-3 text-foreground shadow-xl">
              <span className="font-medium text-[10px]">Create a group</span>
              <Bar className="h-1.5 w-full" />
              <Bar className="h-1.5 w-2/3" />
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[8px] text-muted-foreground">
                  2 / 4
                </span>
                <span className="rounded bg-primary px-2 py-0.5 text-[8px] text-primary-foreground">
                  Next
                </span>
              </div>
            </div>

            {/* Hint beacon */}
            <span className="absolute bottom-[38%] left-[18%] z-20 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
