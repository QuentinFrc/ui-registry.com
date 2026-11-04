import { fileURLToPath } from "node:url";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    // rehype-slug gives headings an id, used by the table of contents.
    // rehype-code-meta keeps ```tsx title="…" for the code block component.
    // Plugins are passed as strings so Turbopack can serialize them.
    rehypePlugins: [
      "rehype-slug",
      fileURLToPath(
        new URL("./src/lib/mdx/rehype-code-meta.mjs", import.meta.url)
      ),
    ],
  },
});

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  // Used at build time by the PDF docs props tables (src/lib/pdf-props.ts).
  serverExternalPackages: ["typescript"],
};

export default withMDX(config);
