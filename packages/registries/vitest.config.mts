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
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
