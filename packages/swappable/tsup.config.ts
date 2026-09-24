import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: false,
  target: "es2022",
  external: ["react"],
  banner: { js: '"use client";' },
});
