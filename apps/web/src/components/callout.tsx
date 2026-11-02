import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: "border-accent-library/40 bg-accent-library/5",
  warning: "border-accent-ui/50 bg-accent-ui/5",
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
  return (
    <aside
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm [&_p]:m-0",
        tones[type],
        className
      )}
    >
      {title ? <p className="font-medium text-foreground">{title}</p> : null}
      <div className="flex flex-col gap-2">{children}</div>
    </aside>
  );
}
