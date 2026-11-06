# @ui-registries/pdf

## 0.1.0

### Minor Changes

- [#14](https://github.com/QuentinFrc/ui-registry/pull/14) [`99e473a`](https://github.com/QuentinFrc/ui-registry/commit/99e473a628dc9ce09b6668c3c88bc0ee304559f1) Thanks [@QuentinFrc](https://github.com/QuentinFrc)! - Core API improvements:

  - Fix: `Block` and `Page` were always unbreakable. They passed `wrap={undefined}`, which react-pdf treats as `wrap={false}`, so content longer than a page was squeezed onto it instead of flowing to the next page. `wrap` is now only passed when `breakable` is set.
  - `<Document theme={...}>` applies theme variables to the whole document. Unlike an outer `<Tailwind>`, it keeps working inside `PDFViewer`, `usePDF` and `pdf()`, which render in a separate React root.
  - Re-export `renderToBuffer`, `renderToStream`, `renderToFile` and `renderToString` for server-side generation.
  - `style` props are typed with react-pdf's `Style` (exported as `Style`).
  - Prop types drop the `PDF` prefix: `PDFBlockProps` → `BlockProps`, `PDFSvgProps` → `SvgProps`, etc. `DocumentProps` is now exported.
  - `Block` and `Text` no longer use `forwardRef` (the ref type was `never`, so refs were unusable).

  tw engine:

  - New: `flex-{n}` and `flex-[n]` (flex factor), `m-auto`, `mx-auto`, `my-auto`, `ml-auto`… , `border-x` / `border-y` (width, color, style), `truncate`, `text-sm/6` and `text-sm/[1.4]`, `leading-[1.2]` / `leading-[18px]`.
  - Fix: `text-[12px]` and `text-[1rem]` were parsed as colors; they now set the font size.
  - Arbitrary `px` and `rem` values are converted to pt like the rest of the scale (1px = 0.75pt, 1rem = 12pt).
  - Breaking: `leading-{n}` now follows Tailwind v4 and uses the spacing scale as an absolute value (`leading-6` → 18pt) instead of a multiplier. Use `leading-[2]` for a multiplier.
  - Fix: the unknown-class dev warning no longer throws when `process` is not defined (browser builds without a `process` shim).

- [#14](https://github.com/QuentinFrc/ui-registry/pull/14) [`99e473a`](https://github.com/QuentinFrc/ui-registry/commit/99e473a628dc9ce09b6668c3c88bc0ee304559f1) Thanks [@QuentinFrc](https://github.com/QuentinFrc)! - Typography, pages and SVG fixes:

  - Fix: `leading-*` multipliers now follow CSS. They apply to the element's own font size, even when it is inherited (react-pdf used 18pt), and children with another `text-*` size get the multiplier against their own size instead of the parent's line height in points.
  - `tracking-*` is now in `em` like Tailwind (`tracking-widest` = 0.1em of the element's font size), and accepts arbitrary values: `tracking-[0.2em]`, `tracking-[2px]`.
  - Fix: `<Page breakable={false}>` kept only the height of its content; it now keeps the requested size.
  - Fix: on auto-height pages (`size={{ width }}`), unbreakable nodes (Svg, Image, `breakable={false}` blocks) were each pushed onto a new page.
  - New: `fill-*` and `stroke-*` utilities (color, `stroke-2`, `stroke-[1.5]`, `/50` opacity) on `Svg`, `G`, `SvgText` and the shapes, which now accept `className`.
  - New: `chart-1` to `chart-5` colors in the default theme.
  - New: `useThemeColor("primary")`, `pdfSafe(formatter)` / `toPdfSafe(text)` and `disableHyphenation()`.

- [#14](https://github.com/QuentinFrc/ui-registry/pull/14) [`99e473a`](https://github.com/QuentinFrc/ui-registry/commit/99e473a628dc9ce09b6668c3c88bc0ee304559f1) Thanks [@QuentinFrc](https://github.com/QuentinFrc)! - Rename package from `@pdf-primitives/react` to `@ui-registries/pdf`. Update your imports: `@pdf-primitives/react` → `@ui-registries/pdf` (same for the `/tw` and `/font` sub-paths).

### Patch Changes

- [#14](https://github.com/QuentinFrc/ui-registry/pull/14) [`99e473a`](https://github.com/QuentinFrc/ui-registry/commit/99e473a628dc9ce09b6668c3c88bc0ee304559f1) Thanks [@QuentinFrc](https://github.com/QuentinFrc)! - Fix `ImageProps` rejecting `src` and `source`: the props type now omits `style` from each member of react-pdf's union instead of from the union as a whole.
