import { highlightCode } from "@repo/ui/lib/highlighter";
import { CodeBlockView } from "./code-block-view";

// Above this many lines, a block starts collapsed with a "Show more" footer.
const COLLAPSE_AFTER_LINES = 20;
const TRAILING_NEWLINE = /\n$/;

interface DocsCodeBlockProps {
  code: string;
  /** Language for highlighting, e.g. "tsx". Unknown languages render plain. */
  language?: string;
  /** Shown in the header, e.g. a file name. Defaults to the language. */
  title?: string;
}

/**
 * Highlighted code block for the docs. Highlighting runs on the server, so
 * Shiki never reaches the client bundle.
 */
export async function DocsCodeBlock({
  code,
  language = "text",
  title,
}: DocsCodeBlockProps) {
  const source = code.replace(TRAILING_NEWLINE, "");
  const lines = (await highlightCode(source, language)) ?? source.split("\n");

  return (
    <CodeBlockView
      code={source}
      collapsible={lines.length > COLLAPSE_AFTER_LINES}
      language={language}
      lines={lines}
      title={title}
    />
  );
}
