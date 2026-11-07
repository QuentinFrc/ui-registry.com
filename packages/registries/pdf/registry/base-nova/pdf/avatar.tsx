import type { BlockProps, ImageProps, TextProps } from "@ui-registries/pdf";
import { Block, cn, Image, Text } from "@ui-registries/pdf";
import { createContext, useContext } from "react";

// Set by AvatarGroup: grouped avatars overlap and get a background ring.
const AvatarGroupContext = createContext(false);

const sizes = {
  sm: "size-6 text-xs",
  default: "size-8 text-sm",
  lg: "size-10 text-base",
} as const;

export interface AvatarProps extends BlockProps {
  /** Preset size. Override with a `size-*` class for any other size. */
  size?: keyof typeof sizes;
}

/**
 * A PDF cannot detect a failed image load, so the fallback is always drawn
 * and the image (if any) is stacked on top of it.
 */
export const Avatar = ({
  size = "default",
  className,
  ...props
}: AvatarProps) => {
  const grouped = useContext(AvatarGroupContext);
  const avatar = (
    <Block
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        sizes[size],
        className
      )}
      {...props}
    />
  );
  // The image covers the avatar's own border, so the ring is a wrapper.
  return grouped ? (
    <Block className="-ml-2 shrink-0 rounded-full bg-background p-0.5">
      {avatar}
    </Block>
  ) : (
    avatar
  );
};

export const AvatarImage = ({ className, ...props }: ImageProps) => (
  <Image
    className={cn(
      "absolute top-0 left-0 size-full rounded-full object-cover",
      className
    )}
    {...props}
  />
);

export interface AvatarFallbackProps extends BlockProps {
  children?: TextProps["children"];
}

export const AvatarFallback = ({
  className,
  children,
  ...props
}: AvatarFallbackProps) => (
  <Block
    className={cn(
      "size-full items-center justify-center rounded-full bg-muted text-muted-foreground",
      className
    )}
    {...props}
  >
    <Text className="font-medium">{children}</Text>
  </Block>
);

/** Overlapping avatars, each one outlined with a background ring. */
export const AvatarGroup = ({ className, children, ...props }: BlockProps) => (
  <AvatarGroupContext.Provider value={true}>
    <Block className={cn("flex-row items-center pl-2", className)} {...props}>
      {children}
    </Block>
  </AvatarGroupContext.Provider>
);
