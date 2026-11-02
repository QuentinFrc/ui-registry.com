import type { ThemeVars } from "@ui-registries/pdf";
import { Block, Document, Page, Text } from "@ui-registries/pdf";

import { Badge } from "./badge";
import { Heading } from "./heading";
import { PageFooter } from "./page-footer";
import { Separator } from "./separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export interface InvoiceParty {
  /** Address lines, email, VAT number… one entry per line. */
  lines?: string[];
  name: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  /** ISO 4217 code, e.g. "EUR". */
  currency: string;
  dueDate: Date;
  from: InvoiceParty;
  issueDate: Date;
  items: InvoiceItem[];
  /** BCP 47 locale used for dates and amounts, e.g. "fr-FR". */
  locale?: string;
  notes?: string;
  number: string;
  status?: "draft" | "due" | "paid" | "overdue";
  /** Tax rate in percent, e.g. 20 for 20%. */
  taxRate?: number;
  to: InvoiceParty;
}

export interface InvoiceLabels {
  amount: string;
  billTo: string;
  description: string;
  dueDate: string;
  invoice: string;
  issueDate: string;
  notes: string;
  quantity: string;
  status: Record<NonNullable<InvoiceData["status"]>, string>;
  subtotal: string;
  tax: string;
  total: string;
  unitPrice: string;
}

const defaultLabels: InvoiceLabels = {
  amount: "Amount",
  billTo: "Bill to",
  description: "Description",
  dueDate: "Due date",
  invoice: "Invoice",
  issueDate: "Issue date",
  notes: "Notes",
  quantity: "Qty",
  status: { draft: "Draft", due: "Due", overdue: "Overdue", paid: "Paid" },
  subtotal: "Subtotal",
  tax: "Tax",
  total: "Total",
  unitPrice: "Unit price",
};

const statusVariant = {
  draft: "outline",
  due: "secondary",
  overdue: "destructive",
  paid: "default",
} as const;

// Some locales (fr-FR…) format with a narrow no-break space (U+202F), which
// the built-in PDF fonts lack. Swap it for a regular no-break space.
const pdfSafe = <T,>(formatter: { format: (value: T) => string }) => ({
  format: (value: T) => formatter.format(value).replace(/\u202f/g, "\u00a0"),
});

export interface InvoiceProps {
  data: InvoiceData;
  labels?: Partial<InvoiceLabels>;
  theme?: ThemeVars;
}

export const Invoice = ({ data, labels, theme }: InvoiceProps) => {
  const l = { ...defaultLabels, ...labels };
  const money = pdfSafe(
    new Intl.NumberFormat(data.locale, {
      currency: data.currency,
      style: "currency",
    })
  );
  const date = pdfSafe(
    new Intl.DateTimeFormat(data.locale, { dateStyle: "medium" })
  );

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const tax = subtotal * ((data.taxRate ?? 0) / 100);

  return (
    <Document
      author={data.from.name}
      theme={theme}
      title={`${l.invoice} ${data.number}`}
    >
      <Page
        className="bg-background px-10 pt-10 pb-20 text-foreground text-sm"
        size="A4"
      >
        {/* Header */}
        <Block className="flex-row items-start justify-between">
          <Block className="gap-1">
            <Heading level={3}>{data.from.name}</Heading>
            {data.from.lines?.map((line) => (
              <Text className="text-muted-foreground" key={line}>
                {line}
              </Text>
            ))}
          </Block>
          <Block className="items-end gap-1">
            <Heading className="uppercase" level={2}>
              {l.invoice}
            </Heading>
            <Text className="text-muted-foreground">{data.number}</Text>
            {data.status && (
              <Badge
                className="mt-1 self-end"
                variant={statusVariant[data.status]}
              >
                {l.status[data.status]}
              </Badge>
            )}
          </Block>
        </Block>

        <Separator className="my-8" />

        {/* Parties & dates */}
        <Block className="flex-row justify-between">
          <Block className="gap-1">
            <Text className="font-medium text-muted-foreground text-xs uppercase">
              {l.billTo}
            </Text>
            <Text className="font-semibold">{data.to.name}</Text>
            {data.to.lines?.map((line) => (
              <Text className="text-muted-foreground" key={line}>
                {line}
              </Text>
            ))}
          </Block>
          <Block className="w-1/3 gap-1">
            <Block className="flex-row justify-between">
              <Text className="text-muted-foreground">{l.issueDate}</Text>
              <Text>{date.format(data.issueDate)}</Text>
            </Block>
            <Block className="flex-row justify-between">
              <Text className="text-muted-foreground">{l.dueDate}</Text>
              <Text className="font-semibold">{date.format(data.dueDate)}</Text>
            </Block>
          </Block>
        </Block>

        {/* Line items */}
        <Table className="mt-10">
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead className="flex-[3]">{l.description}</TableHead>
              <TableHead className="text-right">{l.quantity}</TableHead>
              <TableHead className="flex-[1.5] text-right">
                {l.unitPrice}
              </TableHead>
              <TableHead className="flex-[1.5] text-right">
                {l.amount}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: items have no id
              <TableRow key={i}>
                <TableCell className="flex-[3]">{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="flex-[1.5] text-right">
                  {money.format(item.unitPrice)}
                </TableCell>
                <TableCell className="flex-[1.5] text-right">
                  {money.format(item.quantity * item.unitPrice)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <Block breakable={false} className="mt-6 ml-auto w-1/2 gap-2 px-2">
          <Block className="flex-row justify-between">
            <Text className="text-muted-foreground">{l.subtotal}</Text>
            <Text>{money.format(subtotal)}</Text>
          </Block>
          {data.taxRate !== undefined && (
            <Block className="flex-row justify-between">
              <Text className="text-muted-foreground">
                {l.tax} ({data.taxRate}%)
              </Text>
              <Text>{money.format(tax)}</Text>
            </Block>
          )}
          <Separator />
          <Block className="flex-row justify-between">
            <Text className="font-semibold text-base">{l.total}</Text>
            <Text className="font-semibold text-base">
              {money.format(subtotal + tax)}
            </Text>
          </Block>
        </Block>

        {data.notes && (
          <Block breakable={false} className="mt-10 gap-1">
            <Text className="font-medium text-muted-foreground text-xs uppercase">
              {l.notes}
            </Text>
            <Text className="text-muted-foreground leading-relaxed">
              {data.notes}
            </Text>
          </Block>
        )}

        <PageFooter>
          {`${data.from.name} · ${l.invoice} ${data.number}`}
        </PageFooter>
      </Page>
    </Document>
  );
};
