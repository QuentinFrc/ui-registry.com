import type { ThemeVars } from "@ui-registries/pdf";
import {
  Block,
  cn,
  Document,
  Page,
  pdfSafe,
  Text,
  useThemeColor,
} from "@ui-registries/pdf";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Heading } from "./heading";
import { PageFooter } from "./page-footer";
import { BarChart, LineChart, TrendArrow } from "./report-charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

/** How a metric is formatted. Percent values are fractions (0.25 = 25%). */
export type ReportFormat = "currency" | "number" | "percent";

export interface ReportKpi {
  format?: ReportFormat;
  label: string;
  /** Set when a decrease is good news (churn, costs…). */
  lowerIsBetter?: boolean;
  /** Value of the previous period, used to compute the delta. */
  previous?: number;
  value: number;
}

export interface ReportPoint {
  /** A Date is formatted as a short month name in `data.locale`. */
  label: Date | string;
  value: number;
}

export interface ReportChart {
  description?: string;
  format?: ReportFormat;
  points: ReportPoint[];
  title: string;
}

export interface ReportBreakdownRow {
  label: string;
  previous?: number;
  value: number;
}

export interface ReportBreakdown {
  description?: string;
  format?: ReportFormat;
  rows: ReportBreakdownRow[];
  title: string;
}

export interface ReportData {
  /** Bar chart; the last bar is highlighted as the current period. */
  barChart?: ReportChart;
  /** Table with current value, previous value, change and share of total. */
  breakdown?: ReportBreakdown;
  company: string;
  /** ISO 4217 code, e.g. "USD". */
  currency: string;
  date: Date;
  highlights?: string[];
  kpis: ReportKpi[];
  /** Line chart with an area fill. */
  lineChart?: ReportChart;
  /** BCP 47 locale used for dates and numbers, e.g. "en-US". */
  locale?: string;
  nextSteps?: string[];
  /** Free-form period label, e.g. "October 2026" or "Q3 2026". */
  period: string;
  preparedBy?: string;
  preparedFor?: string;
  title: string;
}

export interface ReportLabels {
  change: string;
  currentPeriod: string;
  date: string;
  highlights: string;
  name: string;
  nextSteps: string;
  percentagePoints: string;
  preparedBy: string;
  preparedFor: string;
  previous: string;
  previousPeriods: string;
  share: string;
  value: string;
  vsPrevious: string;
}

const defaultLabels: ReportLabels = {
  change: "Change",
  currentPeriod: "Current period",
  date: "Date",
  highlights: "Highlights",
  name: "Name",
  nextSteps: "Next steps",
  percentagePoints: "pts",
  preparedBy: "Prepared by",
  preparedFor: "Prepared for",
  previous: "Previous",
  previousPeriods: "Previous periods",
  share: "Share",
  value: "Current",
  vsPrevious: "vs. previous period",
};

// A4 width (595pt) minus page padding (2 × 30pt) and card padding (2 × 12pt).
const CHART_WIDTH = 509;

export interface ReportProps {
  data: ReportData;
  labels?: Partial<ReportLabels>;
  theme?: ThemeVars;
}

const createFormatters = (data: ReportData) => {
  const { currency, locale } = data;
  const formats = {
    currency: pdfSafe(
      new Intl.NumberFormat(locale, {
        currency,
        maximumFractionDigits: 0,
        style: "currency",
      })
    ),
    number: pdfSafe(new Intl.NumberFormat(locale)),
    percent: pdfSafe(
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        style: "percent",
      })
    ),
  };
  const compact = {
    currency: pdfSafe(
      new Intl.NumberFormat(locale, {
        currency,
        maximumFractionDigits: 1,
        notation: "compact",
        style: "currency",
      })
    ),
    number: pdfSafe(
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        notation: "compact",
      })
    ),
    percent: formats.percent,
  };
  const delta = pdfSafe(
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      signDisplay: "exceptZero",
      style: "percent",
    })
  );
  const points = pdfSafe(
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      signDisplay: "exceptZero",
    })
  );
  const date = pdfSafe(new Intl.DateTimeFormat(locale, { dateStyle: "long" }));
  const month = pdfSafe(new Intl.DateTimeFormat(locale, { month: "short" }));
  return { compact, date, delta, formats, month, points };
};

type Formatters = ReturnType<typeof createFormatters>;

/** Relative change, or percentage points for percent metrics. */
const formatChange = (
  value: number,
  previous: number | undefined,
  format: ReportFormat,
  f: Formatters,
  l: ReportLabels
) => {
  if (previous === undefined) {
    return null;
  }
  const diff = value - previous;
  if (format === "percent") {
    return {
      diff,
      text: `${f.points.format(diff * 100)} ${l.percentagePoints}`,
    };
  }
  if (previous === 0) {
    return null;
  }
  return { diff, text: f.delta.format(diff / Math.abs(previous)) };
};

interface DeltaProps {
  className?: string;
  diff: number;
  lowerIsBetter?: boolean;
  text: string;
}

const Delta = ({ className, diff, lowerIsBetter, text }: DeltaProps) => {
  const isGood = lowerIsBetter ? diff <= 0 : diff >= 0;
  const color = useThemeColor(isGood ? "foreground" : "destructive") ?? "";
  return (
    <Block className={cn("flex-row items-center gap-1", className)}>
      {diff !== 0 && (
        <TrendArrow color={color} direction={diff > 0 ? "up" : "down"} />
      )}
      <Text
        className={cn(
          "font-semibold text-xs",
          isGood ? "text-foreground" : "text-destructive"
        )}
      >
        {text}
      </Text>
    </Block>
  );
};

const Legend = ({ labels }: { labels: ReportLabels }) => (
  <Block className="flex-row items-center gap-3">
    <Block className="flex-row items-center gap-1">
      <Block className="h-2 w-2 rounded-sm bg-primary/20" />
      <Text className="text-muted-foreground text-xs">
        {labels.previousPeriods}
      </Text>
    </Block>
    <Block className="flex-row items-center gap-1">
      <Block className="h-2 w-2 rounded-sm bg-primary" />
      <Text className="text-muted-foreground text-xs">
        {labels.currentPeriod}
      </Text>
    </Block>
  </Block>
);

const BulletList = ({ items, title }: { items: string[]; title: string }) => (
  <Block breakable={false} className="flex-1 gap-3">
    <Heading level={4}>{title}</Heading>
    <Block className="gap-2.5">
      {items.map((item) => (
        <Block className="flex-row gap-2.5" key={item}>
          <Block className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          <Text className="flex-1 text-foreground text-sm leading-relaxed">
            {item}
          </Text>
        </Block>
      ))}
    </Block>
  </Block>
);

export const Report = ({ data, labels, theme }: ReportProps) => {
  const l = { ...defaultLabels, ...labels };
  const f = createFormatters(data);
  const pointLabel = (label: ReportPoint["label"]) =>
    label instanceof Date ? f.month.format(label) : label;
  const toChartPoints = (chart: ReportChart) =>
    chart.points.map((p) => ({ label: pointLabel(p.label), value: p.value }));

  const meta = [
    { label: l.preparedFor, value: data.preparedFor },
    { label: l.preparedBy, value: data.preparedBy },
    { label: l.date, value: f.date.format(data.date) },
  ].filter((item): item is { label: string; value: string } =>
    Boolean(item.value)
  );

  const breakdownFormat = data.breakdown?.format ?? "currency";
  const breakdownTotal =
    data.breakdown?.rows.reduce((sum, row) => sum + row.value, 0) ?? 0;

  return (
    <Document
      author={data.preparedBy ?? data.company}
      theme={theme}
      title={`${data.title} · ${data.period}`}
    >
      <Page
        className="gap-5 bg-background px-10 pt-10 pb-20 text-foreground text-sm"
        size="A4"
      >
        {/* Cover header */}
        <Block
          breakable={false}
          className="gap-6 rounded-xl bg-primary px-7 pt-7 pb-6 text-primary-foreground"
        >
          <Block className="flex-row items-start justify-between">
            <Block className="gap-2">
              <Text className="font-semibold text-primary-foreground/60 text-xs uppercase tracking-widest">
                {data.company}
              </Text>
              <Text className="font-bold text-3xl text-primary-foreground tracking-tight">
                {data.title}
              </Text>
            </Block>
            <Block className="rounded-full border border-primary-foreground/30 px-3 py-1">
              <Text className="font-medium text-primary-foreground text-xs">
                {data.period}
              </Text>
            </Block>
          </Block>
          {meta.length > 0 && (
            <Block className="flex-row gap-10 border-primary-foreground/20 border-t pt-4">
              {meta.map((item) => (
                <Block className="gap-1" key={item.label}>
                  <Text className="text-primary-foreground/60 text-xs">
                    {item.label}
                  </Text>
                  <Text className="font-medium text-primary-foreground">
                    {item.value}
                  </Text>
                </Block>
              ))}
            </Block>
          )}
        </Block>

        {/* KPIs */}
        {data.kpis.length > 0 && (
          <Block breakable={false} className="flex-row gap-3">
            {data.kpis.map((kpi) => {
              const format = kpi.format ?? "number";
              const change = formatChange(
                kpi.value,
                kpi.previous,
                format,
                f,
                l
              );
              return (
                <Card className="flex-1 gap-2 py-3.5" key={kpi.label}>
                  <CardHeader className="gap-1.5 px-3.5">
                    <Text className="text-muted-foreground text-xs">
                      {kpi.label}
                    </Text>
                    <Text className="font-semibold text-xl tracking-tight">
                      {f.formats[format].format(kpi.value)}
                    </Text>
                  </CardHeader>
                  {change && (
                    <CardContent className="flex-row flex-wrap items-center gap-1 px-3.5">
                      <Delta
                        diff={change.diff}
                        lowerIsBetter={kpi.lowerIsBetter}
                        text={change.text}
                      />
                      <Text className="text-muted-foreground text-xs">
                        {l.vsPrevious}
                      </Text>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </Block>
        )}

        {/* Bar chart */}
        {data.barChart && (
          <Card breakable={false} className="gap-3">
            <CardHeader className="flex-row items-start justify-between">
              <Block className="gap-1">
                <CardTitle className="text-sm">{data.barChart.title}</CardTitle>
                {data.barChart.description && (
                  <CardDescription className="text-xs">
                    {data.barChart.description}
                  </CardDescription>
                )}
              </Block>
              <Legend labels={l} />
            </CardHeader>
            <CardContent>
              <BarChart
                formatValue={(v) =>
                  f.compact[data.barChart?.format ?? "number"].format(v)
                }
                height={190}
                points={toChartPoints(data.barChart)}
                width={CHART_WIDTH}
              />
            </CardContent>
          </Card>
        )}

        {/* Line chart */}
        {data.lineChart && (
          <Card breakable={false} className="gap-3">
            <CardHeader>
              <CardTitle className="text-sm">{data.lineChart.title}</CardTitle>
              {data.lineChart.description && (
                <CardDescription className="text-xs">
                  {data.lineChart.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <LineChart
                formatValue={(v) =>
                  f.compact[data.lineChart?.format ?? "number"].format(v)
                }
                height={175}
                points={toChartPoints(data.lineChart)}
                width={CHART_WIDTH}
              />
            </CardContent>
          </Card>
        )}

        {/* Breakdown table */}
        {data.breakdown && (
          <Block className="mt-2 gap-3">
            <Block breakable={false} className="gap-1" minPresenceAhead={120}>
              <Heading level={4}>{data.breakdown.title}</Heading>
              {data.breakdown.description && (
                <Text className="text-muted-foreground text-xs">
                  {data.breakdown.description}
                </Text>
              )}
            </Block>
            <Table>
              <TableHeader>
                <TableRow className="border-b-0">
                  <TableHead className="flex-[2.2] pl-0">{l.name}</TableHead>
                  <TableHead className="text-right">{l.value}</TableHead>
                  <TableHead className="text-right">{l.previous}</TableHead>
                  <TableHead className="text-right">{l.change}</TableHead>
                  <TableHead className="flex-[1.6] pr-0 text-right">
                    {l.share}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breakdown.rows.map((row) => {
                  const change = formatChange(
                    row.value,
                    row.previous,
                    breakdownFormat,
                    f,
                    l
                  );
                  const share =
                    breakdownTotal === 0 ? 0 : row.value / breakdownTotal;
                  return (
                    <TableRow className="items-center" key={row.label}>
                      <TableCell className="flex-[2.2] pl-0 font-medium">
                        {row.label}
                      </TableCell>
                      <TableCell className="text-right">
                        {f.formats[breakdownFormat].format(row.value)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.previous === undefined
                          ? "—"
                          : f.formats[breakdownFormat].format(row.previous)}
                      </TableCell>
                      <TableCell className="items-end">
                        {change ? (
                          <Delta diff={change.diff} text={change.text} />
                        ) : (
                          <Text className="text-muted-foreground">—</Text>
                        )}
                      </TableCell>
                      <TableCell className="flex-[1.6] flex-row items-center justify-end gap-2 pr-0">
                        <Block className="h-1.5 w-14 rounded-full bg-muted">
                          <Block
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${Math.round(share * 100)}%` }}
                          />
                        </Block>
                        <Text className="w-10 text-right text-muted-foreground text-xs">
                          {f.formats.percent.format(share)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Block>
        )}

        {/* Highlights & next steps */}
        {Boolean(data.highlights?.length || data.nextSteps?.length) && (
          <Block className="mt-4 flex-row gap-8">
            {data.highlights && data.highlights.length > 0 && (
              <BulletList items={data.highlights} title={l.highlights} />
            )}
            {data.nextSteps && data.nextSteps.length > 0 && (
              <BulletList items={data.nextSteps} title={l.nextSteps} />
            )}
          </Block>
        )}

        <PageFooter>{`${data.company} · ${data.title} · ${data.period}`}</PageFooter>
      </Page>
    </Document>
  );
};
