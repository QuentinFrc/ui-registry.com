import type { BlockProps, ImageProps, TextProps } from "@ui-registries/pdf";
import { Block, cn, Image, Link, Text } from "@ui-registries/pdf";
import type { ReactNode } from "react";
import { Children, createContext, isValidElement, useContext } from "react";

// Typeset for PDF: rhythm for long-form content (terms, letters, articles,
// generated text), after shadcn's Typeset. Three tokens drive everything:
//
//   size     base font size, in pt
//   leading  line height, as a multiple of the font size
//   flow     space between blocks, as a multiple of `size`
//
// Like Typeset, spacing only uses a top margin: the first block of a flow has
// none, and the block right after a heading gets less.

// ─── Tokens & presets ───────────────────────────────────────────────────────

export interface TypesetFonts {
  body: string;
  heading: string;
  mono: string;
}

export interface TypesetTokens {
  flow: number;
  fonts: TypesetFonts;
  leading: number;
  size: number;
}

const SANS: TypesetFonts = {
  body: "Helvetica",
  heading: "Helvetica",
  mono: "Courier",
};

export const typesetPresets = {
  /** Documentation, reports: the default. */
  docs: { size: 10.5, leading: 1.6, flow: 1.1, fonts: SANS },
  /** Dense content: terms and conditions, appendices, fine print. */
  compact: { size: 8.5, leading: 1.45, flow: 0.8, fonts: SANS },
  /** Long reading: letters, articles. Serif body. */
  reading: {
    size: 11.5,
    leading: 1.7,
    flow: 1.3,
    fonts: { body: "Times-Roman", heading: "Helvetica", mono: "Courier" },
  },
  /** Covers, short documents meant to be read from a distance. */
  large: { size: 13, leading: 1.55, flow: 1.25, fonts: SANS },
} as const satisfies Record<string, TypesetTokens>;

export type TypesetPreset = keyof typeof typesetPresets;

const TypesetContext = createContext<TypesetTokens>(typesetPresets.docs);

/** The tokens of the closest `<Typeset>`. */
export const useTypeset = () => useContext(TypesetContext);

const pt = (value: number) => Math.round(value * 100) / 100;

/** A style prop as an array, so token styles can be merged before it. */
const toStyles = (style: BlockProps["style"]) => {
  if (!style) {
    return [];
  }
  return Array.isArray(style) ? style : [style];
};

const TRAILING_NEWLINE = /\n$/;

// ─── Flow: first block & block after a heading ──────────────────────────────

type FlowPosition = "first" | "after-heading" | "default";

const FlowContext = createContext<FlowPosition>("first");

const isHeading = (node: ReactNode) =>
  isValidElement(node) && node.type === TypesetHeading;

/**
 * Lays out children as a flow of blocks. `<Typeset>`, list items and quotes
 * use it; wrap your own containers with it to get the same spacing.
 */
export const TypesetFlow = ({ children }: { children: ReactNode }) => {
  const blocks = Children.toArray(children);
  return (
    <>
      {blocks.map((block, index) => {
        let position: FlowPosition = "default";
        if (index === 0) {
          position = "first";
        } else if (isHeading(blocks[index - 1])) {
          position = "after-heading";
        }
        return (
          <FlowContext.Provider
            key={isValidElement(block) ? (block.key ?? index) : index}
            value={position}
          >
            {block}
          </FlowContext.Provider>
        );
      })}
    </>
  );
};

/** Top margin of a block, from the flow token. */
const useBlockSpacing = (scale = 1) => {
  const { flow, size } = useTypeset();
  const position = useContext(FlowContext);
  if (position === "first") {
    return 0;
  }
  const afterHeading = position === "after-heading" ? 0.5 : 1;
  return pt(flow * size * scale * afterHeading);
};

// ─── Container ──────────────────────────────────────────────────────────────

export interface TypesetProps extends BlockProps {
  /** Space between blocks, as a multiple of `size`. */
  flow?: number;
  fonts?: Partial<TypesetFonts>;
  /** Line height, as a multiple of the font size. */
  leading?: number;
  preset?: TypesetPreset;
  /** Base font size, in pt. */
  size?: number;
}

export const Typeset = ({
  children,
  className,
  flow,
  fonts,
  leading,
  preset = "docs",
  size,
  style,
  ...props
}: TypesetProps) => {
  const base = typesetPresets[preset];
  const tokens: TypesetTokens = {
    flow: flow ?? base.flow,
    fonts: { ...base.fonts, ...fonts },
    leading: leading ?? base.leading,
    size: size ?? base.size,
  };
  return (
    <TypesetContext.Provider value={tokens}>
      <Block
        className={cn("text-foreground", className)}
        style={[
          {
            fontFamily: tokens.fonts.body,
            fontSize: tokens.size,
            lineHeight: tokens.leading,
          },
          ...toStyles(style),
        ]}
        {...props}
      >
        <TypesetFlow>{children}</TypesetFlow>
      </Block>
    </TypesetContext.Provider>
  );
};

// ─── Headings ───────────────────────────────────────────────────────────────

const HEADING_SCALE = { 1: 2, 2: 1.5, 3: 1.2, 4: 1 } as const;
const HEADING_SPACE = { 1: 2, 2: 2, 3: 1.5, 4: 1.25 } as const;
const HEADING_LEADING = 1.25;
// Keep a heading on the same page as at least this many lines after it.
const HEADING_KEEP_LINES = 3;

export interface TypesetHeadingProps extends TextProps {
  level?: keyof typeof HEADING_SCALE;
}

export const TypesetHeading = ({
  className,
  level = 2,
  style,
  ...props
}: TypesetHeadingProps) => {
  const { fonts, leading, size } = useTypeset();
  const marginTop = useBlockSpacing(HEADING_SPACE[level]);
  return (
    <Text
      className={cn(
        "text-foreground",
        level <= 2 ? "font-bold" : "font-semibold",
        className
      )}
      minPresenceAhead={pt(size * leading * HEADING_KEEP_LINES)}
      style={[
        {
          fontFamily: fonts.heading,
          fontSize: pt(size * HEADING_SCALE[level]),
          lineHeight: HEADING_LEADING,
          marginTop,
        },
        ...toStyles(style),
      ]}
      {...props}
    />
  );
};

// ─── Text blocks ────────────────────────────────────────────────────────────

// No lone line at the top or bottom of a page.
const ORPHANS = 2;
const WIDOWS = 2;

export const TypesetParagraph = ({ style, ...props }: TextProps) => {
  const marginTop = useBlockSpacing();
  return (
    <Text
      orphans={ORPHANS}
      style={[{ marginTop }, ...toStyles(style)]}
      widows={WIDOWS}
      {...props}
    />
  );
};

export const TypesetBlockquote = ({
  children,
  className,
  style,
  ...props
}: BlockProps) => {
  const { size } = useTypeset();
  const marginTop = useBlockSpacing();
  return (
    <Block
      className={cn(
        "border-border border-l-2 text-muted-foreground",
        className
      )}
      style={[{ marginTop, paddingLeft: pt(size) }, ...toStyles(style)]}
      {...props}
    >
      <TypesetFlow>{children}</TypesetFlow>
    </Block>
  );
};

export interface TypesetCodeBlockProps extends BlockProps {
  children: string;
}

const CODE_SCALE = 0.85;
const CODE_LEADING = 1.5;

export const TypesetCodeBlock = ({
  children,
  className,
  style,
  ...props
}: TypesetCodeBlockProps) => {
  const { fonts, size } = useTypeset();
  const marginTop = useBlockSpacing();
  return (
    <Block
      className={cn("rounded-md border border-border bg-muted", className)}
      style={[{ marginTop, padding: pt(size * 0.85) }, ...toStyles(style)]}
      {...props}
    >
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: pt(size * CODE_SCALE),
          lineHeight: CODE_LEADING,
        }}
      >
        {children.replace(TRAILING_NEWLINE, "")}
      </Text>
    </Block>
  );
};

export const TypesetRule = ({ className, style, ...props }: BlockProps) => {
  const marginTop = useBlockSpacing(1.5);
  const { flow, size } = useTypeset();
  return (
    <Block
      className={cn("border-border border-b", className)}
      style={[
        // Same space below as above: the next block's margin is regular.
        { marginTop, marginBottom: pt(flow * size * 0.5) },
        ...toStyles(style),
      ]}
      {...props}
    />
  );
};

export const TypesetImage = ({ style, ...props }: ImageProps) => {
  const marginTop = useBlockSpacing();
  return (
    <Image
      style={[
        { marginTop, maxWidth: "100%", objectFit: "contain" },
        ...toStyles(style),
      ]}
      {...props}
    />
  );
};

// ─── Lists ──────────────────────────────────────────────────────────────────

const ListDepthContext = createContext(0);
const ListMarkerContext = createContext<string>("•");

// Built-in PDF fonts only cover WinAnsi: a bullet, then an en dash.
const BULLETS = ["•", "–"] as const;

const ItemPositionContext = createContext(true);
const ItemPosition = ({
  children,
  first,
}: {
  children: ReactNode;
  first: boolean;
}) => (
  <ItemPositionContext.Provider value={first}>
    {children}
  </ItemPositionContext.Provider>
);

export interface TypesetListProps extends BlockProps {
  ordered?: boolean;
  start?: number;
}

export const TypesetList = ({
  children,
  ordered = false,
  start = 1,
  style,
  ...props
}: TypesetListProps) => {
  const depth = useContext(ListDepthContext);
  const { flow, size } = useTypeset();
  const position = useContext(FlowContext);
  const spacing = useBlockSpacing();
  // A nested list sits close to its parent item's text.
  const marginTop =
    depth > 0 && position !== "first" ? pt(flow * size * 0.3) : spacing;
  const items = Children.toArray(children);
  return (
    <Block style={[{ marginTop }, ...toStyles(style)]} {...props}>
      <ListDepthContext.Provider value={depth + 1}>
        {items.map((item, index) => (
          <ListMarkerContext.Provider
            key={isValidElement(item) ? (item.key ?? index) : index}
            value={
              ordered
                ? `${start + index}.`
                : (BULLETS[Math.min(depth, BULLETS.length - 1)] ?? "•")
            }
          >
            <ItemPosition first={index === 0}>{item}</ItemPosition>
          </ListMarkerContext.Provider>
        ))}
      </ListDepthContext.Provider>
    </Block>
  );
};

const MARKER_WIDTH = 1.5;
const ITEM_GAP = 0.35;

export interface TypesetListItemProps extends BlockProps {
  /** Replaces the bullet or number, e.g. a checkbox. */
  marker?: ReactNode;
}

export const TypesetListItem = ({
  children,
  className,
  marker: customMarker,
  style,
  ...props
}: TypesetListItemProps) => {
  const { flow, size } = useTypeset();
  const marker = useContext(ListMarkerContext);
  const first = useContext(ItemPositionContext);
  return (
    <Block
      breakable={false}
      className={cn("flex-row", className)}
      style={[
        { marginTop: first ? 0 : pt(flow * size * ITEM_GAP) },
        ...toStyles(style),
      ]}
      {...props}
    >
      <Block style={{ width: pt(size * MARKER_WIDTH) }}>
        {customMarker ?? <Text>{marker}</Text>}
      </Block>
      <Block style={{ flex: 1 }}>
        <TypesetFlow>{children}</TypesetFlow>
      </Block>
    </Block>
  );
};

// ─── Tables ─────────────────────────────────────────────────────────────────

export const TypesetTable = ({
  children,
  className,
  style,
  ...props
}: BlockProps) => {
  const marginTop = useBlockSpacing();
  return (
    <Block
      className={cn("w-full border-border border-t", className)}
      style={[{ marginTop }, ...toStyles(style)]}
      {...props}
    >
      {children}
    </Block>
  );
};

const TableRowContext = createContext(false);

export interface TypesetTableRowProps extends BlockProps {
  /** Header row: bold, repeated at the top of every page the table spans. */
  header?: boolean;
}

export const TypesetTableRow = ({
  className,
  header = false,
  ...props
}: TypesetTableRowProps) => (
  <TableRowContext.Provider value={header}>
    <Block
      breakable={false}
      className={cn(
        "flex-row border-border border-b",
        header && "bg-muted",
        className
      )}
      fixed={header}
      {...props}
    />
  </TableRowContext.Provider>
);

export interface TypesetTableCellProps extends BlockProps {
  align?: "left" | "center" | "right" | null;
}

const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export const TypesetTableCell = ({
  align,
  children,
  className,
  style,
  ...props
}: TypesetTableCellProps) => {
  const { size } = useTypeset();
  const header = useContext(TableRowContext);
  const padding = pt(size * 0.5);
  return (
    <Block
      className={cn(
        "flex-1",
        align && ALIGN[align],
        header && "font-semibold",
        className
      )}
      style={[
        { paddingHorizontal: padding, paddingVertical: pt(padding * 0.8) },
        ...toStyles(style),
      ]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text>{children}</Text>
      ) : (
        children
      )}
    </Block>
  );
};

// ─── Inline ─────────────────────────────────────────────────────────────────

export const TypesetStrong = ({ className, ...props }: TextProps) => (
  <Text className={cn("font-bold", className)} {...props} />
);

export const TypesetEm = ({ className, ...props }: TextProps) => (
  <Text className={cn("italic", className)} {...props} />
);

export const TypesetDel = ({ className, ...props }: TextProps) => (
  <Text className={cn("line-through", className)} {...props} />
);

const INLINE_CODE_SCALE = 0.9;

export const TypesetCode = ({ className, style, ...props }: TextProps) => {
  const { fonts, size } = useTypeset();
  return (
    <Text
      className={cn("bg-muted", className)}
      style={[
        { fontFamily: fonts.mono, fontSize: pt(size * INLINE_CODE_SCALE) },
        ...toStyles(style),
      ]}
      {...props}
    />
  );
};

export interface TypesetLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
}

/** Inline link: use it inside a paragraph or another text element. */
export const TypesetLink = ({
  children,
  className,
  href,
}: TypesetLinkProps) => (
  <Link className={cn("text-primary underline", className)} src={href}>
    {children}
  </Link>
);
