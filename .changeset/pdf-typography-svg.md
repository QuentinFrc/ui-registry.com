---
"@ui-registries/pdf": minor
---

Typography, pages and SVG fixes:

- Fix: `leading-*` multipliers now follow CSS. They apply to the element's own font size, even when it is inherited (react-pdf used 18pt), and children with another `text-*` size get the multiplier against their own size instead of the parent's line height in points.
- `tracking-*` is now in `em` like Tailwind (`tracking-widest` = 0.1em of the element's font size), and accepts arbitrary values: `tracking-[0.2em]`, `tracking-[2px]`.
- Fix: `<Page breakable={false}>` kept only the height of its content; it now keeps the requested size.
- Fix: on auto-height pages (`size={{ width }}`), unbreakable nodes (Svg, Image, `breakable={false}` blocks) were each pushed onto a new page.
- New: `fill-*` and `stroke-*` utilities (color, `stroke-2`, `stroke-[1.5]`, `/50` opacity) on `Svg`, `G`, `SvgText` and the shapes, which now accept `className`.
- New: `chart-1` to `chart-5` colors in the default theme.
- New: `useThemeColor("primary")`, `pdfSafe(formatter)` / `toPdfSafe(text)` and `disableHyphenation()`.
