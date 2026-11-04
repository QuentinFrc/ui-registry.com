import type { BlockProps, SvgProps, TextProps } from "@ui-registries/pdf";
import { Block, Circle, cn, Path, Svg, Text, useTw } from "@ui-registries/pdf";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const variants = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-destructive/50 bg-card text-destructive",
} as const;

type AlertVariant = keyof typeof variants;

const AlertContext = createContext<AlertVariant>("default");

export interface AlertProps extends BlockProps {
  /**
   * Icon shown in a left column, e.g. `<AlertIconInfo />`. react-pdf has no
   * CSS grid, so the icon is a prop instead of the first child.
   */
  icon?: ReactNode;
  variant?: AlertVariant;
}

export const Alert = ({
  variant = "default",
  icon,
  className,
  children,
  ...props
}: AlertProps) => (
  <AlertContext.Provider value={variant}>
    <Block
      breakable={false}
      className={cn(
        "w-full flex-row gap-2.5 rounded-lg border px-4 py-3 text-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon ? <Block className="pt-px">{icon}</Block> : null}
      <Block className="flex-1 gap-1">{children}</Block>
    </Block>
  </AlertContext.Provider>
);

export const AlertTitle = ({ className, ...props }: TextProps) => (
  <Text
    className={cn("font-medium text-sm leading-snug tracking-tight", className)}
    {...props}
  />
);

export const AlertDescription = ({ className, ...props }: TextProps) => {
  const variant = useContext(AlertContext);
  return (
    <Text
      className={cn(
        "text-sm leading-relaxed",
        variant === "destructive"
          ? "text-destructive/90"
          : "text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};

// ─── Icons ───────────────────────────────────────────────────────────────────
// Lucide-style 24×24 stroke icons. Size and color come from `className`
// (`size-*`, `text-*`); by default they follow the alert variant.

type AlertIconProps = Omit<SvgProps, "children">;

const AlertIcon = ({
  className,
  children,
  ...props
}: AlertIconProps & {
  children: (color: string) => ReactNode;
}) => {
  const tw = useTw();
  const variant = useContext(AlertContext);
  const { width, height, color } = tw(
    cn(
      "size-4",
      variant === "destructive" ? "text-destructive" : "text-foreground",
      className
    )
  );
  return (
    <Svg height={height} viewBox="0 0 24 24" width={width} {...props}>
      {children(String(color))}
    </Svg>
  );
};

const stroke = (color: string) =>
  ({
    fill: "none",
    stroke: color,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
  }) as const;

export const AlertIconInfo = (props: AlertIconProps) => (
  <AlertIcon {...props}>
    {(color) => (
      <>
        <Circle cx={12} cy={12} r={10} {...stroke(color)} />
        <Path d="M12 16v-4" {...stroke(color)} />
        <Path d="M12 8h.01" {...stroke(color)} />
      </>
    )}
  </AlertIcon>
);

export const AlertIconWarning = (props: AlertIconProps) => (
  <AlertIcon {...props}>
    {(color) => (
      <>
        <Path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
          {...stroke(color)}
        />
        <Path d="M12 9v4" {...stroke(color)} />
        <Path d="M12 17h.01" {...stroke(color)} />
      </>
    )}
  </AlertIcon>
);

export const AlertIconCheck = (props: AlertIconProps) => (
  <AlertIcon {...props}>
    {(color) => (
      <>
        <Circle cx={12} cy={12} r={10} {...stroke(color)} />
        <Path d="m9 12 2 2 4-4" {...stroke(color)} />
      </>
    )}
  </AlertIcon>
);
