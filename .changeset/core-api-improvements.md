---
"@ui-registries/pdf": minor
---

Core API improvements:

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
