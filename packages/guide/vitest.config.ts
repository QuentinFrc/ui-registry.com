import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.tsx"],
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // Type-only modules and the React entry's re-exports.
      exclude: [
        "src/types.ts",
        "src/driver.ts",
        "src/react/types.ts",
        "src/react/index.ts",
      ],
      thresholds: {
        // Vanilla entry.
        "src/*.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // `/react` entry.
        "src/react/**": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
      },
    },
  },
});
