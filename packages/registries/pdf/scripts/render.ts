// Renders preview documents to PDF and PNG.
//
//   pnpm --filter @repo/registries pdf:render [names…] [--blocks] [--out <dir>]
//     [--all-pages] [--png-only] [--scale <n>]
//
// Without names, renders every preview (or every block with --blocks).
// Writes <name>.pdf and <name>.png (first page), or <name>-<page>.png for
// every page with --all-pages.
// Renders preview documents to PDF and PNG.
//
//   pnpm --filter @repo/registries pdf:render [names…] [--out <dir>] [--all-pages] [--scale <n>]
//
// Without names, renders every preview. Writes <name>.pdf and <name>.png
// (first page) — or <name>-<page>.png for every page with --all-pages.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { blockPreviews, type PreviewName, previews } from "../previews";
import { rasterize, renderPreview } from "./rasterize";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", default: "out" },
    "all-pages": { type: "boolean", default: false },
    blocks: { type: "boolean", default: false },
    "png-only": { type: "boolean", default: false },
    scale: { type: "string", default: "2" },
  },
});

const defaultNames = Object.keys(values.blocks ? blockPreviews : previews);
const names = (
  positionals.length > 0 ? positionals : defaultNames
) as PreviewName[];
const unknown = names.filter((name) => !(name in previews));
if (unknown.length > 0) {
  console.error(`Unknown preview(s): ${unknown.join(", ")}`);
  console.error(`Available: ${Object.keys(previews).join(", ")}`);
  process.exit(1);
}

const outDir = resolve(process.cwd(), values.out);
mkdirSync(outDir, { recursive: true });

// manifest.json: page count and pixel size of every rendered preview, read by
// the docs to lay out the images without loading them first.
interface ManifestEntry {
  height: number;
  pages: number;
  width: number;
}
const manifestPath = join(outDir, "manifest.json");
const manifest: Record<string, ManifestEntry> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf-8"))
  : {};

// PNG IHDR chunk: width and height are big-endian uint32 at bytes 16 and 20.
const pngSize = (png: Buffer) => ({
  width: png.readUInt32BE(16),
  height: png.readUInt32BE(20),
});

for (const name of names) {
  const buffer = await renderPreview(name);
  if (!values["png-only"]) {
    writeFileSync(join(outDir, `${name}.pdf`), buffer);
  }
  const pages = await rasterize(buffer, {
    scale: Number(values.scale),
    maxPages: values["all-pages"] ? Number.POSITIVE_INFINITY : 1,
  });
  if (values["all-pages"]) {
    for (const [index, png] of pages.entries()) {
      writeFileSync(join(outDir, `${name}-${index + 1}.png`), png);
    }
  } else if (pages[0]) {
    writeFileSync(join(outDir, `${name}.png`), pages[0]);
  }
  if (pages[0]) {
    manifest[name] = { pages: pages.length, ...pngSize(pages[0]) };
  }
  console.log(
    `  ✓ ${name} (${pages.length} page${pages.length > 1 ? "s" : ""})`
  );
}

const sorted = Object.fromEntries(
  Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))
);
writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
