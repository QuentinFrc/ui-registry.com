# @ui-registries/pdf

Tailwind-style `className` support for `@react-pdf/renderer`. A standalone wrapper — you never need to import `@react-pdf/renderer` directly.

## Install

```bash
npm install @ui-registries/pdf @react-pdf/renderer react
```

## Usage

```tsx
import {
  Document,
  Page,
  Block,
  Text,
  Image,
  Link,
  Tailwind,
  cn,
} from "@ui-registries/pdf";

function MyPDF() {
  return (
    <Tailwind theme={{ "--color-brand": "#0073e6" }}>
      <Document>
        <Page className="p-8 bg-white">
          <Block className="flex flex-row items-center gap-4">
            <Text className="text-2xl font-bold text-brand">Hello PDF</Text>
          </Block>
          <Block className={cn("mt-4 p-4", isActive && "bg-blue-50")}>
            <Text className="text-sm text-muted-foreground">
              Built with @ui-registries/pdf
            </Text>
          </Block>
        </Page>
      </Document>
    </Tailwind>
  );
}
```

### Standalone `tw` engine

```ts
import { createTw } from "@ui-registries/pdf/tw";

const tw = createTw({ "--color-brand": "#0073e6" });
tw("p-4 bg-brand text-white");
// → { paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12, backgroundColor: "#0073e6", color: "#ffffff" }
```

## API

### Components

| Component  | Description                                  |
| ---------- | -------------------------------------------- |
| `Block`    | Styled `View` — the primary layout primitive |
| `View`     | Deprecated alias for `Block`                 |
| `Text`     | Styled text                                  |
| `Page`     | Styled page                                  |
| `Image`    | Styled image                                 |
| `Link`     | Styled hyperlink                             |
| `Document` | Pass-through document wrapper                |
| `Canvas`   | Styled canvas with `paint` callback          |
| `Note`     | Styled PDF annotation                        |

### Re-exports from @react-pdf/renderer

`Font`, `StyleSheet`, `PDFViewer`, `PDFDownloadLink`, `BlobProvider`, `usePDF`, `pdf`

### SVG elements

`Svg`, `G`, `Path`, `Rect`, `Circle`, `Ellipse`, `Line`, `Polyline`, `Polygon`, `SvgText`, `Tspan`, `Defs`, `ClipPath`, `Stop`, `LinearGradient`, `RadialGradient`

### Helpers

- `cn(...args)` — join class names, filtering falsy values
- `createTw(theme?)` — create a `tw()` function with optional custom theme
- `tw(classes)` — default `tw()` with built-in theme
- `Tailwind` — React context provider for theme
- `useTw()` — access `tw()` from context

## Supported Utility Classes

### Layout

`flex`, `hidden`, `flex-row`, `flex-col`, `flex-wrap`, `flex-nowrap`, `flex-1`, `flex-auto`, `flex-initial`, `flex-none`, `grow`, `grow-0`, `shrink`, `shrink-0`

### Alignment

`items-{start,end,center,baseline,stretch}`, `self-{auto,start,end,center,stretch,baseline}`, `justify-{start,end,center,between,around,evenly}`, `content-{start,end,center,between,around,stretch}`

### Spacing

`p-{n}`, `px-{n}`, `py-{n}`, `pt-{n}`, `pr-{n}`, `pb-{n}`, `pl-{n}`, `m-{n}`, `mx-{n}`, `my-{n}`, `mt-{n}`, `mr-{n}`, `mb-{n}`, `ml-{n}`, `gap-{n}`, `gap-x-{n}`, `gap-y-{n}`

Negative prefixes: `-mt-2`, `-ml-4`, etc.

### Sizing

`w-{n}`, `h-{n}`, `min-w-{n}`, `max-w-{n}`, `min-h-{n}`, `max-h-{n}`, `w-full`, `w-auto`, `h-full`, `h-auto`

Fractions: `w-1/2`, `w-2/3`, `h-1/4`, etc.

### Flex-basis

`basis-{n}`, `basis-auto`, `basis-full`, `basis-1/2`, etc.

### Order

`order-{1-12}`, `order-first`, `order-last`, `order-none`

### Aspect Ratio

`aspect-square`, `aspect-video`, `aspect-auto`, `aspect-[4/3]`

### Position

`relative`, `absolute`, `top-{n}`, `right-{n}`, `bottom-{n}`, `left-{n}`, `z-{n}`

### Typography

`text-{size}`, `text-{color}`, `font-{weight}`, `italic`, `not-italic`, `text-left`, `text-center`, `text-right`, `text-justify`, `uppercase`, `lowercase`, `capitalize`, `normal-case`, `leading-{n}`, `tracking-{n}`, `line-clamp-{n}`

### Text Decoration

`underline`, `line-through`, `no-underline`, `decoration-{color}`, `decoration-{solid,dashed,dotted,double,wavy}`, `indent-{n}`

### Borders

`border`, `border-{n}`, `border-{t,r,b,l}`, `border-{color}`, `border-{solid,dashed,dotted}`, `rounded`, `rounded-{size}`, `rounded-{side}-{size}`

### Colors

`bg-{color}`, `text-{color}`, `border-{color}`, `decoration-{color}`

Alpha modifier: `bg-red-500/50`, `text-black/25`

### Opacity

`opacity-{0-100}`

### Overflow

`overflow-hidden`, `overflow-visible`

### Object Fit

`object-{contain,cover,fill,none,scale-down}`, `object-{bottom,center,left,right,top}`

### Transforms

`rotate-{n}`, `scale-{n}`, `scale-x-{n}`, `scale-y-{n}`, `translate-x-{n}`, `translate-y-{n}`

### Arbitrary Values

`w-[210mm]`, `h-[297mm]`, `p-[1in]`, `w-[50vw]`, `text-[14]`, `z-[99]`, `aspect-[4/3]`

## Custom Theme

```tsx
<Tailwind theme={{
  "--color-brand-500": "#0073e6",
  "--color-brand-600": "#005bb5",
  "--text-tiny": 5,
  "--radius-pill": 50,
  "--spacing-18": 72,
  "--color-*": "initial",  // reset all default colors
}}>
```

## License

MIT
