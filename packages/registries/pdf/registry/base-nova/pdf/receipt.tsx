import type { ThemeVars } from "@ui-registries/pdf";
import { Block, Document, Page, pdfSafe, Text } from "@ui-registries/pdf";

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

export interface ReceiptMerchant {
  /** Address lines, email, VAT number… one entry per line. */
  lines?: string[];
  name: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptData {
  /** ISO 4217 code, e.g. "EUR". */
  currency: string;
  items: ReceiptItem[];
  /** BCP 47 locale used for dates and amounts, e.g. "fr-FR". */
  locale?: string;
  merchant: ReceiptMerchant;
  /** Closing message, e.g. "Thank you for your purchase!". */
  message?: string;
  number: string;
  paidAt: Date;
  /** Free text, e.g. "Visa •••• 4242". */
  paymentMethod: string;
  /**
   * When true, unit prices already include tax (retail, TTC) and the tax is
   * extracted from the total. Otherwise it is added on top.
   */
  pricesIncludeTax?: boolean;
  /** Tax rate in percent, e.g. 20 for 20%. */
  taxRate?: number;
  /** IANA time zone for the payment time, e.g. "Europe/Paris". Defaults to the runtime's. */
  timeZone?: string;
}

export interface ReceiptLabels {
  amount: string;
  amountPaid: string;
  item: string;
  paidAt: string;
  paymentMethod: string;
  receipt: string;
  subtotal: string;
  tax: string;
  total: string;
}

const defaultLabels: ReceiptLabels = {
  amount: "Amount",
  amountPaid: "Amount paid",
  item: "Item",
  paidAt: "Paid on",
  paymentMethod: "Payment method",
  receipt: "Receipt",
  subtotal: "Subtotal",
  tax: "Tax",
  total: "Total",
};

const Row = ({
  emphasis = false,
  label,
  value,
}: {
  emphasis?: boolean;
  label: string;
  value: string;
}) => (
  <Block className="flex-row justify-between gap-4">
    <Text
      className={emphasis ? "font-semibold text-base" : "text-muted-foreground"}
    >
      {label}
    </Text>
    <Text className={emphasis ? "font-semibold text-base" : undefined}>
      {value}
    </Text>
  </Block>
);

export interface ReceiptProps {
  data: ReceiptData;
  labels?: Partial<ReceiptLabels>;
  theme?: ThemeVars;
}

export const Receipt = ({ data, labels, theme }: ReceiptProps) => {
  const l = { ...defaultLabels, ...labels };
  const currency = new Intl.NumberFormat(data.locale, {
    currency: data.currency,
    style: "currency",
  });
  const money = pdfSafe(currency);
  const dateTime = pdfSafe(
    new Intl.DateTimeFormat(data.locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: data.timeZone,
    })
  );

  const itemsTotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  // Round to the currency's minor unit so subtotal + tax always adds up to
  // the printed total, even when the tax is extracted from TTC prices.
  const factor = 10 ** (currency.resolvedOptions().maximumFractionDigits ?? 2);
  const round = (value: number) => Math.round(value * factor) / factor;
  const rate = (data.taxRate ?? 0) / 100;
  const total = round(
    data.pricesIncludeTax ? itemsTotal : itemsTotal * (1 + rate)
  );
  const subtotal = data.pricesIncludeTax
    ? round(total / (1 + rate))
    : itemsTotal;
  const tax = total - subtotal;

  return (
    <Document
      author={data.merchant.name}
      theme={theme}
      title={`${l.receipt} ${data.number}`}
    >
      <Page
        className="bg-background px-8 pt-8 pb-16 text-foreground text-sm"
        size="A5"
      >
        {/* Merchant */}
        <Block className="flex-row items-start justify-between gap-6">
          <Block className="flex-1 gap-0.5">
            <Heading level={4}>{data.merchant.name}</Heading>
            {data.merchant.lines?.map((line) => (
              <Text className="text-muted-foreground text-xs" key={line}>
                {line}
              </Text>
            ))}
          </Block>
          <Block className="items-end gap-0.5">
            <Text className="font-semibold text-base uppercase">
              {l.receipt}
            </Text>
            <Text className="text-muted-foreground text-xs">{data.number}</Text>
          </Block>
        </Block>

        {/* Amount paid */}
        <Block className="mt-6 items-center gap-1 rounded-lg bg-muted px-4 py-5">
          <Text className="font-medium text-muted-foreground text-xs uppercase">
            {l.amountPaid}
          </Text>
          <Text className="font-bold text-3xl tracking-tight">
            {money.format(total)}
          </Text>
        </Block>

        {/* Payment details */}
        <Block className="mt-5 gap-1.5">
          <Row label={l.paidAt} value={dateTime.format(data.paidAt)} />
          <Row label={l.paymentMethod} value={data.paymentMethod} />
        </Block>

        {/* Items */}
        <Table className="mt-5">
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead className="flex-[3] px-0">{l.item}</TableHead>
              <TableHead className="px-0 text-right">{l.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: items have no id
              <TableRow key={i}>
                <TableCell className="flex-[3] gap-0.5 px-0">
                  <Text>{item.description}</Text>
                  {item.quantity !== 1 && (
                    <Text className="text-muted-foreground text-xs">
                      {`${item.quantity} × ${money.format(item.unitPrice)}`}
                    </Text>
                  )}
                </TableCell>
                <TableCell className="px-0 text-right">
                  {money.format(item.quantity * item.unitPrice)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <Block breakable={false} className="mt-4 gap-1.5">
          <Row label={l.subtotal} value={money.format(subtotal)} />
          {data.taxRate !== undefined && (
            <Row
              label={`${l.tax} (${data.taxRate}%)`}
              value={money.format(tax)}
            />
          )}
          <Separator className="my-1" />
          <Row emphasis label={l.total} value={money.format(total)} />
        </Block>

        {data.message && (
          <Block breakable={false} className="mt-8 items-center">
            <Text className="text-center text-muted-foreground">
              {data.message}
            </Text>
          </Block>
        )}

        <PageFooter className="right-8 bottom-5 left-8">
          {`${data.merchant.name} · ${l.receipt} ${data.number}`}
        </PageFooter>
      </Page>
    </Document>
  );
};
