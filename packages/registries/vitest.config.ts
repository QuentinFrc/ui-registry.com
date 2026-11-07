import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const uiSrc = resolve(import.meta.dirname, "../ui/src");

export default defineConfig({
  resolve: {
    // The registry files' imports, as in `tsconfig.json`.
    alias: [
      { find: /^@\//, replacement: `${uiSrc}/` },
      { find: /^@repo\/ui\//, replacement: `${uiSrc}/` },
    ],
  },
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "pdf",
          environment: "node",
          include: ["pdf/**/*.test.{ts,tsx}"],
          // Rendering + rasterizing a multi-page PDF takes a few seconds.
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: "guide",
          environment: "jsdom",
          include: ["tests/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});
