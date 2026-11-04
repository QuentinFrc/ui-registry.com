import type { BlockProps, PageNumberProps } from "@ui-registries/pdf";
import { Block, cn, PageNumber, Text } from "@ui-registries/pdf";

export interface PageFooterProps extends BlockProps {
  /** Custom page number format. Defaults to "1 / 3". */
  pageNumber?: PageNumberProps["render"] | false;
}

// Fixed footer repeated on every page. Position it to match your page
// padding, e.g. className="bottom-8 left-12 right-12".
export const PageFooter = ({
  pageNumber,
  className,
  children,
  ...props
}: PageFooterProps) => (
  <Block
    className={cn(
      "absolute right-10 bottom-6 left-10 flex-row items-center justify-between border-border border-t pt-2 text-muted-foreground text-xs",
      className
    )}
    fixed
    {...props}
  >
    <Block>
      {typeof children === "string" ? <Text>{children}</Text> : children}
    </Block>
    {pageNumber !== false && <PageNumber render={pageNumber} />}
  </Block>
);
