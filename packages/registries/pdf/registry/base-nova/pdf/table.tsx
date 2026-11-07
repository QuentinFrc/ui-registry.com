import type { BlockProps } from "@ui-registries/pdf";
import { Block, cn, Text } from "@ui-registries/pdf";
import type React from "react";

// Strings and numbers need a <Text> in react-pdf; text styles set on the
// cell (size, color, alignment) are inherited by it.
const renderContent = (children: React.ReactNode) =>
  typeof children === "string" || typeof children === "number" ? (
    <Text>{children}</Text>
  ) : (
    children
  );

export const Table = ({ className, ...props }: BlockProps) => (
  <Block className={cn("w-full text-sm", className)} {...props} />
);

export interface TableHeaderProps extends BlockProps {
  /** Repeat the header on every page the table spans. */
  repeat?: boolean;
}

export const TableHeader = ({
  repeat = true,
  className,
  ...props
}: TableHeaderProps) => (
  <Block
    className={cn("border-border border-b", className)}
    fixed={repeat}
    {...props}
  />
);

export const TableBody = ({ className, ...props }: BlockProps) => (
  <Block className={className} {...props} />
);

export const TableFooter = ({ className, ...props }: BlockProps) => (
  <Block
    className={cn("border-border border-t bg-muted/50 font-medium", className)}
    {...props}
  />
);

export const TableRow = ({ className, ...props }: BlockProps) => (
  <Block
    breakable={false}
    className={cn("flex-row border-border border-b", className)}
    {...props}
  />
);

export const TableHead = ({ className, children, ...props }: BlockProps) => (
  <Block
    className={cn(
      "flex-1 px-2 py-2 font-medium text-muted-foreground",
      className
    )}
    {...props}
  >
    {renderContent(children)}
  </Block>
);

export const TableCell = ({ className, children, ...props }: BlockProps) => (
  <Block className={cn("flex-1 px-2 py-2", className)} {...props}>
    {renderContent(children)}
  </Block>
);
