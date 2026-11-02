import type { BlockProps, TextProps } from "@ui-registries/pdf";
import { Block, cn, Text } from "@ui-registries/pdf";

export const Card = ({ className, ...props }: BlockProps) => (
  <Block
    className={cn(
      "gap-4 rounded-lg border border-border bg-card py-4 text-card-foreground",
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: BlockProps) => (
  <Block className={cn("gap-1 px-4", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: TextProps) => (
  <Text className={cn("font-semibold text-base", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: TextProps) => (
  <Text className={cn("text-muted-foreground text-sm", className)} {...props} />
);

export const CardContent = ({ className, ...props }: BlockProps) => (
  <Block className={cn("px-4", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: BlockProps) => (
  <Block className={cn("flex-row items-center px-4", className)} {...props} />
);
