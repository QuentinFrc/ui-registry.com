import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Trimmed-down shadcn button: the registry demos only need these variants.
const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/85",
  outline: "border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
} as const;

const SIZES = {
  default: "h-8 gap-1.5 px-2.5",
  sm: "h-7 gap-1 px-2.5 text-[0.8rem]",
  "icon-sm": "size-7",
} as const;

interface ButtonProps extends ComponentProps<"button"> {
  size?: keyof typeof SIZES;
  variant?: keyof typeof VARIANTS;
}

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg border border-transparent font-medium text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      data-slot="button"
      type={type}
      {...props}
    />
  );
}

export { Button };
