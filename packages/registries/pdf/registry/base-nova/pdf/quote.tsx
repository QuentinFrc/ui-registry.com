import type { ThemeVars } from "@ui-registries/pdf";
import { Block, Document, Page, pdfSafe, Text } from "@ui-registries/pdf";

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

export interface QuoteParty {
  /** Address lines, email, VAT number… one entry per line. */
  lines?: string[];
  name: string;
}

export interface QuoteItem {
  description: string;
  /** Optional secondary line shown under the description. */
  detail?: string;
  quantity: number;
  /** Unit of measure, e.g. "day", "screen", "h". */
  unit?: string;
  unitPrice: number;
}

export interface QuoteDiscount {
  /** "percent" applies `value`% to the subtotal, "amount" subtracts `value`. */
  type: "amount" | "percent";
  value: number;
}

export interface QuoteData {
  /** ISO 4217 code, e.g. "EUR". */
  currency: string;
  discount?: QuoteDiscount;
  from: QuoteParty;
  /** Short paragraph introducing the project, shown under its title. */
  intro?: string;
  issueDate: Date;
  items: QuoteItem[];
  /** BCP 47 locale used for dates and amounts, e.g. "fr-FR". */
  locale?: string;
  number: string;
  /** Project title shown above the line items. */
  project?: string;
  status?: "draft" | "sent" | "accepted" | "declined" | "expired";
  /** Tax rate in percent, e.g. 20 for 20%. Applied after the discount. */
  taxRate?: number;
  /** Terms & conditions, one entry per clause. */
  terms?: string[];
  to: QuoteParty;
  validUntil: Date;
}

export interface QuoteLabels {
  acceptance: string;
  acceptanceNote: string;
  acceptedBy: string;
  amount: string;
  date: string;
  description: string;
  discount: string;
  issueDate: string;
  preparedFor: string;
  quantity: string;
  quote: string;
  signature: string;
  status: Record<NonNullable<QuoteData["status"]>, string>;
  subtotal: string;
  tax: string;
  terms: string;
  total: string;
  unit: string;
  unitPrice: string;
  validUntil: string;
}

const defaultLabels: QuoteLabels = {
  acceptance: "Acceptance",
  acceptanceNote:
    "To accept this quote, sign below and return a copy before the expiry date.",
  acceptedBy: "Accepted by",
  amount: "Amount",
  date: "Date",
  description: "Description",
  discount: "Discount",
  issueDate: "Issue date",
  preparedFor: "Prepared for",
  quantity: "Qty",
  quote: "Quote",
  signature: "Signature",
  status: {
    accepted: "Accepted",
    declined: "Declined",
    draft: "Draft",
    expired: "Expired",
    sent: "Sent",
  },
  subtotal: "Subtotal",
  tax: "Tax",
  terms: "Terms & conditions",
  total: "Total",
  unit: "Unit",
  unitPrice: "Unit price",
  validUntil: "Valid until",
};

const statusVariant = {
  accepted: "default",
  declined: "destructive",
  draft: "outline",
  expired: "outline",
  sent: "secondary",
} as const;

const SectionLabel = ({ children }: { children: string }) => (
  <Text className="font-medium text-muted-foreground text-xs uppercase">
    {children}
  </Text>
);

const SignatureField = ({ label }: { label: string }) => (
  <Block className="flex-1 gap-1">
    <Text className="text-muted-foreground text-xs">{label}</Text>
    <Block className="h-16 border-border border-b" />
  </Block>
);

export interface QuoteProps {
  data: QuoteData;
  labels?: Partial<QuoteLabels>;
  theme?: ThemeVars;
}

export const Quote = ({ data, labels, theme }: QuoteProps) => {
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
  let discount = 0;
  if (data.discount) {
    discount =
      data.discount.type === "percent"
        ? subtotal * (data.discount.value / 100)
        : data.discount.value;
  }
  const taxable = subtotal - discount;
  const tax = taxable * ((data.taxRate ?? 0) / 100);
  const hasUnits = data.items.some((item) => item.unit);

  return (
    <Document
      author={data.from.name}
      theme={theme}
      title={`${l.quote} ${data.number}`}
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
              {l.quote}
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
            <SectionLabel>{l.preparedFor}</SectionLabel>
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
              <Text className="text-muted-foreground">{l.validUntil}</Text>
              <Text className="font-semibold">
                {date.format(data.validUntil)}
              </Text>
            </Block>
          </Block>
        </Block>

        {/* Project */}
        {(data.project || data.intro) && (
          <Block className="mt-8 gap-2">
            {data.project && <Heading level={4}>{data.project}</Heading>}
            {data.intro && (
              <Text className="text-muted-foreground text-sm leading-relaxed">
                {data.intro}
              </Text>
            )}
          </Block>
        )}

        {/* Line items */}
        <Table className="mt-8">
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead className="flex-[3.5]">{l.description}</TableHead>
              <TableHead className="flex-[0.8] text-right">
                {l.quantity}
              </TableHead>
              {hasUnits && <TableHead>{l.unit}</TableHead>}
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
                <TableCell className="flex-[3.5] gap-0.5">
                  <Text>{item.description}</Text>
                  {item.detail && (
                    <Text className="text-muted-foreground text-xs leading-snug">
                      {item.detail}
                    </Text>
                  )}
                </TableCell>
                <TableCell className="flex-[0.8] text-right">
                  {item.quantity}
                </TableCell>
                {hasUnits && (
                  <TableCell className="text-muted-foreground">
                    {item.unit ?? ""}
                  </TableCell>
                )}
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

        {/* Terms & totals */}
        <Block className="mt-6 flex-row gap-10">
          <Block className="flex-1 gap-2 pt-1">
            {data.terms && data.terms.length > 0 && (
              <>
                {/* Keep the title with at least the first clause */}
                <Block minPresenceAhead={30}>
                  <SectionLabel>{l.terms}</SectionLabel>
                </Block>
                {data.terms.map((term, i) => (
                  <Block
                    breakable={false}
                    className="flex-row gap-1"
                    key={term}
                  >
                    <Text className="w-3 text-muted-foreground text-xs leading-relaxed">
                      {`${i + 1}.`}
                    </Text>
                    <Text className="flex-1 text-muted-foreground text-xs leading-relaxed">
                      {term}
                    </Text>
                  </Block>
                ))}
              </>
            )}
          </Block>
          <Block breakable={false} className="w-5/12 gap-2 px-2">
            <Block className="flex-row justify-between">
              <Text className="text-muted-foreground">{l.subtotal}</Text>
              <Text>{money.format(subtotal)}</Text>
            </Block>
            {data.discount && (
              <Block className="flex-row justify-between">
                <Text className="text-muted-foreground">
                  {data.discount.type === "percent"
                    ? `${l.discount} (${data.discount.value}%)`
                    : l.discount}
                </Text>
                <Text>{money.format(-discount)}</Text>
              </Block>
            )}
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
                {money.format(taxable + tax)}
              </Text>
            </Block>
          </Block>
        </Block>

        {/* Acceptance */}
        <Block
          breakable={false}
          className="mt-8 gap-5 rounded-lg border border-border p-5"
        >
          <Block className="gap-1">
            <SectionLabel>{l.acceptance}</SectionLabel>
            <Text className="text-muted-foreground">{l.acceptanceNote}</Text>
          </Block>
          <Block className="flex-row gap-6">
            <SignatureField label={l.acceptedBy} />
            <SignatureField label={l.date} />
            <Block className="flex-[1.4] gap-1">
              <Text className="text-muted-foreground text-xs">
                {l.signature}
              </Text>
              <Block className="h-16 rounded-md border border-border bg-muted/50" />
            </Block>
          </Block>
        </Block>

        <PageFooter>
          {`${data.from.name} · ${l.quote} ${data.number}`}
        </PageFooter>
      </Page>
    </Document>
  );
};
