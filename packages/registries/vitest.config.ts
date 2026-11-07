import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", "dist"],
    // Rendering + rasterizing a multi-page PDF takes a few seconds.
    testTimeout: 60_000,
  },
});
