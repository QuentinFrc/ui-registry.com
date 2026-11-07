import type { BlockProps } from "@ui-registries/pdf";
import { Block, cn } from "@ui-registries/pdf";

export interface SeparatorProps extends BlockProps {
  orientation?: "horizontal" | "vertical";
}

export const Separator = ({
  orientation = "horizontal",
  className,
  ...props
}: SeparatorProps) => (
  <Block
    className={cn(
      "border-border",
      orientation === "horizontal"
        ? "w-full border-b"
        : "self-stretch border-l",
      className
    )}
    {...props}
  />
);
