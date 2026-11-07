import type { BlockProps } from "@ui-registries/pdf";
import { Block, cn, Text } from "@ui-registries/pdf";

const variants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-white",
  outline: "border border-border text-foreground",
} as const;

export interface BadgeProps extends BlockProps {
  variant?: keyof typeof variants;
}

export const Badge = ({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) => (
  <Block
    className={cn(
      "flex-row items-center self-start rounded-full px-2 py-0.5 font-medium text-xs",
      variants[variant],
      className
    )}
    {...props}
  >
    {typeof children === "string" || typeof children === "number" ? (
      <Text>{children}</Text>
    ) : (
      children
    )}
  </Block>
);
