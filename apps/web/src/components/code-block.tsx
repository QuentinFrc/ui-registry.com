import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { type BundledLanguage, codeToHast } from "shiki";

// Same themes as rehype-pretty-code in next.config.mjs, so the
// `code[data-theme]` rules in global.css pick the light / dark colour.
const THEMES = { light: "github-light", dark: "github-dark" } as const;
const DATA_THEME = `${THEMES.light} ${THEMES.dark}`;

interface CodeBlockProps {
  code: string;
  lang?: BundledLanguage;
}

/** Server-rendered, syntax-highlighted code block for non-MDX pages. */
export async function CodeBlock({ code, lang = "sh" }: CodeBlockProps) {
  const hast = await codeToHast(code, {
    lang,
    themes: THEMES,
    defaultColor: false,
    transformers: [
      {
        pre(node) {
          // Drop shiki's inline background; .prose-content pre styles it.
          node.properties.style = undefined;
          node.properties.tabindex = undefined;
          node.properties["data-theme"] = DATA_THEME;
        },
        code(node) {
          node.properties["data-theme"] = DATA_THEME;
        },
      },
    ],
  });

  return (
    <div className="prose-content">
      {toJsxRuntime(hast, { Fragment, jsx, jsxs })}
    </div>
  );
}
