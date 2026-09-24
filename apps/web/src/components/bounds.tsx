import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BoundsProps = HTMLAttributes<HTMLDivElement>;

export function Bounds({ className, children, ...props }: BoundsProps) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)} {...props}>
      {children}
    </div>
  );
}
