import { defineConfig, type Options } from "tsup";

type Plugin = NonNullable<Options["plugins"]>[number];

/**
 * `"use client"` on the React entry only: the vanilla entry (and the chunk
 * both entries share) stays usable from server code.
 */
const useClient: Plugin = {
  name: "use-client",
  renderChunk(code, chunk) {
    if (!chunk.path.endsWith("react.js")) {
      return;
    }
    const map =
      typeof chunk.map === "string" ? JSON.parse(chunk.map) : chunk.map;
    // One line added on top: shift the mappings by one generated line.
    const shifted = map ? { ...map, mappings: `;${map.mappings}` } : map;
    return { code: `"use client";\n${code}`, map: shifted };
  },
};

export default defineConfig({
  entry: { index: "src/index.ts", react: "src/react/index.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Rollup tree shaking would drop the "use client" directive.
  treeshake: false,
  target: "es2022",
  external: ["react", "react-dom"],
  plugins: [useClient],
});
