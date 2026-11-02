// Preview documents for every pdf registry item. Shared by the docs
// (live <PdfPreview>), the thumbnail script and the visual tests.
// Not part of any registry item: it is never installed by consumers.
import { Block, Document, Page, Text } from "@ui-registries/pdf";
import type { ReactElement, ReactNode } from "react";

import { Badge } from "./registry/base-nova/pdf/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./registry/base-nova/pdf/card";
import { Certificate } from "./registry/base-nova/pdf/certificate";
import { exampleCertificate } from "./registry/base-nova/pdf/certificate-example";
import { Heading } from "./registry/base-nova/pdf/heading";
import { Invoice } from "./registry/base-nova/pdf/invoice";
import { exampleInvoice } from "./registry/base-nova/pdf/invoice-example";
import { PageFooter } from "./registry/base-nova/pdf/page-footer";
import { Quote } from "./registry/base-nova/pdf/quote";
import { exampleQuote } from "./registry/base-nova/pdf/quote-example";
import { Receipt } from "./registry/base-nova/pdf/receipt";
import { exampleReceipt } from "./registry/base-nova/pdf/receipt-example";
import { Report } from "./registry/base-nova/pdf/report";
import { exampleReport } from "./registry/base-nova/pdf/report-example";
import { Resume } from "./registry/base-nova/pdf/resume";
import { exampleResume } from "./registry/base-nova/pdf/resume-example";
import { Separator } from "./registry/base-nova/pdf/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./registry/base-nova/pdf/table";

const SHEET_WIDTH = 420;

// Component previews: fixed width, height fitted to the content unless set.
const Sheet = ({
  children,
  height,
}: {
  children: ReactNode;
  height?: number;
}) => (
  <Document>
    <Page
      className="gap-6 bg-background p-10 text-sm"
      size={height ? { width: SHEET_WIDTH, height } : { width: SHEET_WIDTH }}
    >
      {children}
    </Page>
  </Document>
);

const rows = [
  { name: "Alice Martin", role: "Engineer", status: "Active" },
  { name: "Bruno Petit", role: "Designer", status: "Away" },
  { name: "Chloé Bernard", role: "Product", status: "Active" },
];

export const componentPreviews = {
  badge: (
    <Sheet>
      <Block className="flex-row gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </Block>
    </Sheet>
  ),
  card: (
    <Sheet>
      <Card>
        <CardHeader>
          <CardTitle>Quarterly summary</CardTitle>
          <CardDescription>Q3 2026 — all regions</CardDescription>
        </CardHeader>
        <CardContent>
          <Text>Revenue grew 18% compared to the previous quarter.</Text>
        </CardContent>
        <CardFooter className="justify-between">
          <Text className="text-muted-foreground">Total</Text>
          <Text className="font-semibold">€ 1.2M</Text>
        </CardFooter>
      </Card>
    </Sheet>
  ),
  heading: (
    <Sheet>
      <Heading level={1}>Heading 1</Heading>
      <Heading level={2}>Heading 2</Heading>
      <Heading level={3}>Heading 3</Heading>
      <Heading level={4}>Heading 4</Heading>
    </Sheet>
  ),
  "page-footer": (
    <Sheet height={420}>
      <Text>The footer is repeated at the bottom of every page.</Text>
      <PageFooter>Acme Studio · Annual report</PageFooter>
    </Sheet>
  ),
  separator: (
    <Sheet>
      <Text>Above the separator</Text>
      <Separator />
      <Block className="h-10 flex-row items-center gap-4">
        <Text>Left</Text>
        <Separator orientation="vertical" />
        <Text>Right</Text>
      </Block>
    </Sheet>
  ),
  table: (
    <Sheet>
      <Table>
        <TableHeader>
          <TableRow className="border-b-0">
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.role}
              </TableCell>
              <TableCell className="text-right">{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Sheet>
  ),
} satisfies Record<string, ReactElement>;

// Full documents. Each one gets a thumbnail in the docs block grid.
export const blockPreviews = {
  certificate: <Certificate data={exampleCertificate} />,
  invoice: <Invoice data={exampleInvoice} />,
  quote: <Quote data={exampleQuote} />,
  receipt: <Receipt data={exampleReceipt} />,
  report: <Report data={exampleReport} />,
  resume: <Resume data={exampleResume} />,
} satisfies Record<string, ReactElement>;

export const previews = { ...componentPreviews, ...blockPreviews };

export type PreviewName = keyof typeof previews;
export type BlockName = keyof typeof blockPreviews;
