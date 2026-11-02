import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { previews } from "./previews";
import { rasterize, renderPreview } from "./scripts/rasterize";

// Visual regression tests: every preview is rendered to PDF, rasterized and
// compared with the committed snapshot in __screenshots__/.
//
// Update snapshots after an intended visual change:
//   UPDATE_SNAPSHOTS=1 pnpm --filter @repo/registries test
const SNAPSHOT_DIR = resolve(import.meta.dirname, "__screenshots__");
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";
// Share of pixels allowed to differ: absorbs anti-aliasing differences
// between platforms, catches any real layout or color change.
const MAX_DIFF_RATIO = 0.0005;

const registry = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "registry.json"), "utf-8")
) as { items: { name: string; type: string }[] };

describe("pdf registry", () => {
  it("has a preview for every component and block", () => {
    const documented = registry.items
      .filter((item) => item.type !== "registry:lib")
      .map((item) => item.name);
    expect(Object.keys(previews).sort()).toEqual(documented.sort());
  });
});

describe("pdf previews", () => {
  for (const name of Object.keys(previews) as (keyof typeof previews)[]) {
    it(`${name} matches its snapshot`, async () => {
      const pages = await rasterize(await renderPreview(name), { scale: 1 });
      const snapshot = (page: number) =>
        join(SNAPSHOT_DIR, `${name}-${page}.png`);

      if (UPDATE || !existsSync(snapshot(1))) {
        mkdirSync(SNAPSHOT_DIR, { recursive: true });
        for (const [index, png] of pages.entries()) {
          writeFileSync(snapshot(index + 1), png);
        }
        return;
      }

      expect(existsSync(snapshot(pages.length + 1)), "page count").toBe(false);
      for (const [index, png] of pages.entries()) {
        const expectedPath = snapshot(index + 1);
        expect(existsSync(expectedPath), `${name} page ${index + 1}`).toBe(
          true
        );
        const actual = PNG.sync.read(png);
        const expected = PNG.sync.read(readFileSync(expectedPath));
        expect([actual.width, actual.height]).toEqual([
          expected.width,
          expected.height,
        ]);
        const diff = pixelmatch(
          actual.data,
          expected.data,
          undefined,
          actual.width,
          actual.height,
          { threshold: 0.1 }
        );
        const ratio = diff / (actual.width * actual.height);
        expect(ratio, `${name} page ${index + 1} differs`).toBeLessThan(
          MAX_DIFF_RATIO
        );
      }
    });
  }
});
