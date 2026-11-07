import type { TextProps } from "@ui-registries/pdf";
import { cn, Text } from "@ui-registries/pdf";

const levels = {
  1: "text-3xl font-bold tracking-tight",
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-semibold",
  4: "text-base font-semibold",
} as const;

export interface HeadingProps extends TextProps {
  level?: keyof typeof levels;
}

export const Heading = ({ level = 1, className, ...props }: HeadingProps) => (
  <Text
    className={cn("text-foreground", levels[level], className)}
    {...props}
  />
);
