import createMDX from "@next/mdx";

/** @type {import('rehype-pretty-code').Options} */
const prettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark",
  },
  keepBackground: false,
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    // rehype-slug gives headings an id, used by the table of contents.
    rehypePlugins: ["rehype-slug", ["rehype-pretty-code", prettyCodeOptions]],
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
