// biome-ignore-all lint/suspicious/noArrayIndexKey: elements come from a static token list, rendered once and never reordered
import { Path, Rect, Svg, Text, useThemeColor } from "@ui-registries/pdf";
import { lexer, type Token, type Tokens } from "marked";
import type { ComponentProps, ComponentType, ReactNode } from "react";

import {
  Typeset,
  TypesetBlockquote,
  TypesetCode,
  TypesetCodeBlock,
  TypesetDel,
  TypesetEm,
  TypesetHeading,
  TypesetImage,
  TypesetLink,
  TypesetList,
  TypesetListItem,
  TypesetParagraph,
  type TypesetProps,
  TypesetRule,
  TypesetStrong,
  TypesetTable,
  TypesetTableCell,
  TypesetTableRow,
  useTypeset,
} from "./typeset";

// Renders Markdown (CommonMark + GFM tables and strikethrough) with the
// Typeset components. Raw HTML is ignored.

const defaultComponents = {
  blockquote: TypesetBlockquote,
  code: TypesetCode,
  codeBlock: TypesetCodeBlock,
  del: TypesetDel,
  em: TypesetEm,
  heading: TypesetHeading,
  image: TypesetImage,
  link: TypesetLink,
  list: TypesetList,
  listItem: TypesetListItem,
  paragraph: TypesetParagraph,
  rule: TypesetRule,
  strong: TypesetStrong,
  table: TypesetTable,
  tableCell: TypesetTableCell,
  tableRow: TypesetTableRow,
};

export type TypesetMarkdownComponents = {
  [K in keyof typeof defaultComponents]: ComponentType<
    ComponentProps<(typeof defaultComponents)[K]>
  >;
};

const MAX_HEADING_LEVEL = 4;
const SOFT_BREAK = /\n/g;

const renderInline = (
  tokens: Token[] | undefined,
  c: TypesetMarkdownComponents
): ReactNode[] =>
  (tokens ?? []).map((token, index) => {
    const key = index;
    switch (token.type) {
      case "text":
        return "tokens" in token && token.tokens?.length
          ? renderInline(token.tokens, c)
          : token.text.replace(SOFT_BREAK, " ");
      case "escape":
        return token.text;
      case "strong":
        return <c.strong key={key}>{renderInline(token.tokens, c)}</c.strong>;
      case "em":
        return <c.em key={key}>{renderInline(token.tokens, c)}</c.em>;
      case "del":
        return <c.del key={key}>{renderInline(token.tokens, c)}</c.del>;
      case "codespan":
        return <c.code key={key}>{token.text}</c.code>;
      case "link":
        return (
          <c.link href={token.href} key={key}>
            {renderInline(token.tokens, c)}
          </c.link>
        );
      case "br":
        return "\n";
      // Inline images can't sit inside text in a PDF: keep the alt text.
      case "image":
        return token.text;
      default:
        return null;
    }
  });

// Task list items ("- [x] Done"): the built-in fonts have no checkbox glyph,
// so the box is drawn.
const CHECKBOX_SIZE = 0.8;
const CHECKBOX_LIFT = 0.1;

const TaskCheckbox = ({ checked }: { checked: boolean }) => {
  const { leading, size } = useTypeset();
  const box = size * CHECKBOX_SIZE;
  const color = useThemeColor("foreground");
  const border = useThemeColor("border");
  const background = useThemeColor("background");
  return (
    // Centered on the first line of text.
    <Svg
      height={box}
      // Centered on the first line, nudged up to the x-height.
      style={{ marginTop: (size * leading - box) / 2 - size * CHECKBOX_LIFT }}
      viewBox="0 0 10 10"
      width={box}
    >
      <Rect
        fill={checked ? color : "none"}
        height={9}
        rx={2}
        stroke={checked ? color : border}
        strokeWidth={1}
        width={9}
        x={0.5}
        y={0.5}
      />
      {checked ? (
        <Path
          d="M2.6 5.2 L4.3 6.9 L7.4 3.4"
          fill="none"
          stroke={background}
          strokeWidth={1.4}
        />
      ) : null}
    </Svg>
  );
};

const isLoneImage = (token: Tokens.Paragraph) =>
  token.tokens.length === 1 && token.tokens[0]?.type === "image";

const renderBlocks = (
  tokens: Token[],
  c: TypesetMarkdownComponents
): ReactNode[] =>
  tokens.map((token, index) => {
    const key = index;
    switch (token.type) {
      case "heading":
        return (
          <c.heading
            key={key}
            level={Math.min(token.depth, MAX_HEADING_LEVEL) as 1 | 2 | 3 | 4}
          >
            {renderInline(token.tokens, c)}
          </c.heading>
        );
      case "paragraph": {
        if (isLoneImage(token as Tokens.Paragraph)) {
          const image = token.tokens?.[0] as Tokens.Image;
          return <c.image key={key} src={image.href} />;
        }
        return (
          <c.paragraph key={key}>{renderInline(token.tokens, c)}</c.paragraph>
        );
      }
      // Items of tight lists hold bare text blocks.
      case "text":
        return (
          <c.paragraph key={key}>
            {renderInline(token.tokens ?? [token], c)}
          </c.paragraph>
        );
      case "list":
        return (
          <c.list
            key={key}
            ordered={token.ordered}
            start={typeof token.start === "number" ? token.start : 1}
          >
            {(token as Tokens.List).items.map((item, itemIndex) => (
              <c.listItem
                key={itemIndex}
                marker={
                  item.task ? (
                    <TaskCheckbox checked={Boolean(item.checked)} />
                  ) : undefined
                }
              >
                {renderBlocks(
                  item.tokens.filter((token) => token.type !== "checkbox"),
                  c
                )}
              </c.listItem>
            ))}
          </c.list>
        );
      case "blockquote":
        return (
          <c.blockquote key={key}>
            {renderBlocks(token.tokens ?? [], c)}
          </c.blockquote>
        );
      case "code":
        return <c.codeBlock key={key}>{token.text}</c.codeBlock>;
      case "hr":
        return <c.rule key={key} />;
      case "table": {
        const table = token as Tokens.Table;
        return (
          <c.table key={key}>
            <c.tableRow header>
              {table.header.map((cell, cellIndex) => (
                <c.tableCell align={table.align[cellIndex]} key={cellIndex}>
                  <Text>{renderInline(cell.tokens, c)}</Text>
                </c.tableCell>
              ))}
            </c.tableRow>
            {table.rows.map((row, rowIndex) => (
              <c.tableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <c.tableCell align={table.align[cellIndex]} key={cellIndex}>
                    <Text>{renderInline(cell.tokens, c)}</Text>
                  </c.tableCell>
                ))}
              </c.tableRow>
            ))}
          </c.table>
        );
      }
      default:
        return null;
    }
  });

export interface TypesetMarkdownProps extends Omit<TypesetProps, "children"> {
  /** Markdown source. */
  children: string;
  /** Replace the component used for any element. */
  components?: Partial<TypesetMarkdownComponents>;
}

export const TypesetMarkdown = ({
  children,
  components,
  ...props
}: TypesetMarkdownProps) => {
  const c = {
    ...defaultComponents,
    ...components,
  } as TypesetMarkdownComponents;
  return <Typeset {...props}>{renderBlocks(lexer(children), c)}</Typeset>;
};
