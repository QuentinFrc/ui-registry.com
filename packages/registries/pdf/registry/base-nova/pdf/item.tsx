import type { BlockProps, TextProps } from "@ui-registries/pdf";
import { Block, cn, Text } from "@ui-registries/pdf";
import type { ReactNode } from "react";

import { Separator, type SeparatorProps } from "./separator";

const renderContent = (children: ReactNode) =>
  typeof children === "string" || typeof children === "number" ? (
    <Text>{children}</Text>
  ) : (
    children
  );

export const ItemGroup = ({ className, ...props }: BlockProps) => (
  <Block className={cn("w-full", className)} {...props} />
);

export const ItemSeparator = ({ className, ...props }: SeparatorProps) => (
  <Separator className={cn("my-0", className)} {...props} />
);

const itemVariants = {
  default: "border-transparent",
  outline: "border-border",
  muted: "border-transparent bg-muted/50",
} as const;

const itemSizes = {
  default: "gap-4 p-4",
  sm: "gap-2.5 px-4 py-3",
} as const;

export interface ItemProps extends BlockProps {
  size?: keyof typeof itemSizes;
  variant?: keyof typeof itemVariants;
}

export const Item = ({
  variant = "default",
  size = "default",
  className,
  ...props
}: ItemProps) => (
  <Block
    breakable={false}
    className={cn(
      "w-full flex-row flex-wrap items-center rounded-md border text-sm",
      itemVariants[variant],
      itemSizes[size],
      className
    )}
    {...props}
  />
);

const mediaVariants = {
  default: "",
  icon: "size-8 rounded-sm border border-border bg-muted",
  image: "size-10 overflow-hidden rounded-sm",
} as const;

export interface ItemMediaProps extends BlockProps {
  variant?: keyof typeof mediaVariants;
}

export const ItemMedia = ({
  variant = "default",
  className,
  ...props
}: ItemMediaProps) => (
  <Block
    className={cn(
      "shrink-0 flex-row items-center justify-center gap-2",
      mediaVariants[variant],
      className
    )}
    {...props}
  />
);

export const ItemContent = ({ className, ...props }: BlockProps) => (
  <Block className={cn("flex-1 gap-1", className)} {...props} />
);

export const ItemTitle = ({ className, ...props }: TextProps) => (
  <Text
    className={cn("font-medium text-sm leading-snug", className)}
    {...props}
  />
);

export const ItemDescription = ({ className, ...props }: TextProps) => (
  <Text
    className={cn(
      "line-clamp-2 text-muted-foreground text-sm leading-normal",
      className
    )}
    {...props}
  />
);

/** Right-aligned area: an amount, a badge, a date… */
export const ItemActions = ({ className, children, ...props }: BlockProps) => (
  <Block className={cn("flex-row items-center gap-2", className)} {...props}>
    {renderContent(children)}
  </Block>
);

/** Full-width row above the media and content. */
export const ItemHeader = ({ className, children, ...props }: BlockProps) => (
  <Block
    className={cn(
      "basis-full flex-row items-center justify-between gap-2",
      className
    )}
    {...props}
  >
    {renderContent(children)}
  </Block>
);

/** Full-width row below the media and content. */
export const ItemFooter = ({ className, children, ...props }: BlockProps) => (
  <Block
    className={cn(
      "basis-full flex-row items-center justify-between gap-2",
      className
    )}
    {...props}
  >
    {renderContent(children)}
  </Block>
);
