import {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Svg,
  SvgText,
  useTw,
} from "@ui-registries/pdf";

// Small dependency-free charts drawn with Svg primitives. Colors are resolved
// from the document theme, so they follow the `theme` passed to <Document>.

export interface ChartPoint {
  label: string;
  value: number;
}

interface ChartProps {
  /** Formats y-axis ticks and the highlighted value. */
  formatValue: (value: number) => string;
  height: number;
  points: ChartPoint[];
  /** Number of y-axis intervals to aim for. */
  ticks?: number;
  width: number;
}

const AXIS_FONT_SIZE = 7;
const VALUE_FONT_SIZE = 7.5;
// Rough Helvetica average glyph width, used to reserve room for y labels.
const GLYPH_WIDTH = 0.56;
const NICE_STEPS = [1, 2, 2.5, 5, 10];

export interface Scale {
  max: number;
  min: number;
  ticks: number[];
}

/** Rounds a [min, max] domain to "nice" ticks (1, 2, 2.5, 5 × 10ⁿ). */
export const niceScale = (min: number, max: number, count = 4): Scale => {
  const span = max - min || Math.abs(max) || 1;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    (NICE_STEPS.find((s) => s * magnitude >= rough) ?? 10) * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax + step / 2; tick += step) {
    // Avoid floating point noise like 0.30000000000000004.
    ticks.push(Number(tick.toPrecision(12)));
  }
  return { max: niceMax, min: niceMin, ticks };
};

const useColor = (token: string) => {
  const tw = useTw();
  return String(tw(`text-${token}`).color ?? "");
};

const useChartColors = () => ({
  axis: useColor("muted-foreground"),
  grid: useColor("border"),
  primary: useColor("primary"),
  surface: useColor("background"),
});

const plotArea = (
  scale: Scale,
  formatValue: ChartProps["formatValue"],
  width: number,
  height: number
) => {
  const longest = Math.max(
    ...scale.ticks.map((tick) => formatValue(tick).length)
  );
  const left = Math.ceil(longest * AXIS_FONT_SIZE * GLYPH_WIDTH) + 8;
  const top = 14;
  const bottom = 16;
  const right = 4;
  return {
    bottom: height - bottom,
    height: height - top - bottom,
    left,
    right: width - right,
    top,
    width: width - left - right,
  };
};

interface GridProps {
  area: ReturnType<typeof plotArea>;
  colors: ReturnType<typeof useChartColors>;
  formatValue: ChartProps["formatValue"];
  scale: Scale;
  y: (value: number) => number;
}

const Grid = ({ area, colors, formatValue, scale, y }: GridProps) => (
  <G>
    {scale.ticks.map((tick) => (
      <G key={tick}>
        <Line
          stroke={colors.grid}
          strokeDasharray={tick === scale.min ? undefined : "2 2"}
          strokeWidth={0.75}
          x1={area.left}
          x2={area.right}
          y1={y(tick)}
          y2={y(tick)}
        />
        <SvgText
          fill={colors.axis}
          style={{ fontSize: AXIS_FONT_SIZE }}
          textAnchor="end"
          x={area.left - 6}
          y={y(tick) + AXIS_FONT_SIZE / 3}
        >
          {formatValue(tick)}
        </SvgText>
      </G>
    ))}
  </G>
);

/** Vertical bars from zero; the last bar (current period) is highlighted. */
export const BarChart = ({
  formatValue,
  height,
  points,
  ticks = 5,
  width,
}: ChartProps) => {
  const colors = useChartColors();
  if (points.length === 0) {
    return null;
  }
  const values = points.map((p) => p.value);
  const scale = niceScale(
    Math.min(0, ...values),
    Math.max(0, ...values),
    ticks
  );
  const area = plotArea(scale, formatValue, width, height);
  const y = (value: number) =>
    area.bottom - ((value - scale.min) / (scale.max - scale.min)) * area.height;
  const slot = area.width / Math.max(points.length, 1);
  const barWidth = Math.min(slot * 0.62, 28);
  const last = points.length - 1;

  return (
    <Svg height={height} width={width}>
      <Grid
        area={area}
        colors={colors}
        formatValue={formatValue}
        scale={scale}
        y={y}
      />
      {points.map((point, i) => {
        const x = area.left + slot * i + (slot - barWidth) / 2;
        const top = Math.min(y(point.value), y(0));
        const barHeight = Math.abs(y(point.value) - y(0));
        const isCurrent = i === last;
        return (
          <G key={`${point.label}-${i}`}>
            <Rect
              fill={colors.primary}
              fillOpacity={isCurrent ? 1 : 0.18}
              height={barHeight}
              rx={1.5}
              width={barWidth}
              x={x}
              y={top}
            />
            {isCurrent && (
              <SvgText
                fill={colors.primary}
                style={{ fontSize: VALUE_FONT_SIZE, fontWeight: 700 }}
                textAnchor="middle"
                x={x + barWidth / 2}
                y={top - 4}
              >
                {formatValue(point.value)}
              </SvgText>
            )}
            <SvgText
              fill={colors.axis}
              style={{ fontSize: AXIS_FONT_SIZE }}
              textAnchor="middle"
              x={x + barWidth / 2}
              y={area.bottom + 11}
            >
              {point.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

/** Line with a soft area fill; the domain hugs the data to show the trend. */
export const LineChart = ({
  formatValue,
  height,
  points,
  ticks = 4,
  width,
}: ChartProps) => {
  const colors = useChartColors();
  if (points.length === 0) {
    return null;
  }
  const values = points.map((p) => p.value);
  const scale = niceScale(Math.min(...values), Math.max(...values), ticks);
  const area = plotArea(scale, formatValue, width, height);
  const y = (value: number) =>
    area.bottom - ((value - scale.min) / (scale.max - scale.min)) * area.height;
  const step = area.width / Math.max(points.length, 1);
  const x = (i: number) => area.left + step * i + step / 2;
  const coords = points.map((p, i) => [x(i), y(p.value)] as const);
  const line = coords
    .map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx},${cy}`)
    .join(" ");
  const first = coords[0];
  const lastPoint = coords.at(-1);
  const fill =
    first && lastPoint
      ? `${line} L${lastPoint[0]},${area.bottom} L${first[0]},${area.bottom} Z`
      : "";
  const lastValue = points.at(-1)?.value;

  return (
    <Svg height={height} width={width}>
      <Grid
        area={area}
        colors={colors}
        formatValue={formatValue}
        scale={scale}
        y={y}
      />
      <Path d={fill} fill={colors.primary} fillOpacity={0.07} />
      <Path
        d={line}
        fill="none"
        stroke={colors.primary}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      {coords.map(([cx, cy], i) => (
        <Circle
          cx={cx}
          cy={cy}
          fill={colors.surface}
          key={`${points[i]?.label}-${i}`}
          r={i === coords.length - 1 ? 3 : 1.75}
          stroke={colors.primary}
          strokeWidth={i === coords.length - 1 ? 1.5 : 1}
        />
      ))}
      {lastPoint && lastValue !== undefined && (
        <SvgText
          fill={colors.primary}
          style={{ fontSize: VALUE_FONT_SIZE, fontWeight: 700 }}
          textAnchor="end"
          x={lastPoint[0]}
          y={lastPoint[1] - 7}
        >
          {formatValue(lastValue)}
        </SvgText>
      )}
      {points.map((point, i) => (
        <SvgText
          fill={colors.axis}
          key={`${point.label}-${i}`}
          style={{ fontSize: AXIS_FONT_SIZE }}
          textAnchor="middle"
          x={x(i)}
          y={area.bottom + 11}
        >
          {point.label}
        </SvgText>
      ))}
    </Svg>
  );
};

export interface TrendArrowProps {
  color: string;
  direction: "up" | "down";
  size?: number;
}

/** Filled triangle; Helvetica has no ▲▼ glyphs, so it is drawn instead. */
export const TrendArrow = ({ color, direction, size = 6 }: TrendArrowProps) => {
  const w = size;
  const h = size * 0.8;
  const d =
    direction === "up"
      ? `M0,${h} L${w / 2},0 L${w},${h} Z`
      : `M0,0 L${w / 2},${h} L${w},0 Z`;
  return (
    <Svg height={h} width={w}>
      <Path d={d} fill={color} />
    </Svg>
  );
};

/** Resolves a theme color token (e.g. "primary") to a color string. */
export const useThemeColor = useColor;
