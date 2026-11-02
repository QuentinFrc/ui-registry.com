import { renderToBuffer } from "@ui-registries/pdf";
import { pdf } from "pdf-to-img";

import { type PreviewName, previews } from "../previews";

export const renderPreview = (name: PreviewName): Promise<Buffer> =>
  renderToBuffer(previews[name]);

interface RasterizeOptions {
  maxPages?: number;
  scale?: number;
}

/** Converts a PDF to one PNG buffer per page. */
export async function rasterize(
  buffer: Buffer,
  { scale = 2, maxPages = Number.POSITIVE_INFINITY }: RasterizeOptions = {}
): Promise<Buffer[]> {
  const document = await pdf(buffer, { scale });
  const pages: Buffer[] = [];
  for await (const page of document) {
    pages.push(page);
    if (pages.length >= maxPages) {
      break;
    }
  }
  return pages;
}
