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
    rehypePlugins: [["rehype-pretty-code", prettyCodeOptions]],
  },
});

/** @type {import('next').NextConfig} */
const config = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
};

export default withMDX(config);
