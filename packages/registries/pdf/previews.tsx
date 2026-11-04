// Preview documents for every pdf registry item. Shared by the docs
// (live <PdfPreview>), the thumbnail script and the visual tests.
// Not part of any registry item: it is never installed by consumers.
import { join } from "node:path";
import {
  Block,
  Document,
  Image,
  Page,
  Path,
  Svg,
  Text,
  useTw,
} from "@ui-registries/pdf";
import type { ReactElement, ReactNode } from "react";

import {
  Alert,
  AlertDescription,
  AlertIconCheck,
  AlertIconInfo,
  AlertIconWarning,
  AlertTitle,
} from "./registry/base-nova/pdf/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "./registry/base-nova/pdf/avatar";
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./registry/base-nova/pdf/item";
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
import {
  Typeset,
  TypesetBlockquote,
  TypesetCode,
  TypesetHeading,
  TypesetLink,
  TypesetList,
  TypesetListItem,
  TypesetParagraph,
  TypesetStrong,
} from "./registry/base-nova/pdf/typeset";
import { TypesetMarkdown } from "./registry/base-nova/pdf/typeset-markdown";

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

// Local images only: previews are rendered offline (scripts and tests).
const asset = (file: string) => join(import.meta.dirname, "assets", file);

const people = [
  { name: "Alice Martin", initials: "AM", image: asset("avatar-1.png") },
  { name: "Bruno Petit", initials: "BP", image: asset("avatar-2.png") },
  { name: "Chloé Bernard", initials: "CB", image: asset("avatar-3.png") },
  { name: "David Roux", initials: "DR" },
];

const invoices = [
  {
    number: "INV-2041",
    client: "Northwind Traders",
    due: "Due Nov 14, 2026",
    amount: "€ 4,250.00",
    status: "Paid",
  },
  {
    number: "INV-2042",
    client: "Globex Corporation",
    due: "Due Nov 21, 2026",
    amount: "€ 1,180.00",
    status: "Due",
  },
  {
    number: "INV-2043",
    client: "Initech",
    due: "Overdue since Oct 30, 2026",
    amount: "€ 920.00",
    status: "Overdue",
  },
] as const;

const FileIcon = () => {
  const color = String(useTw()("text-muted-foreground").color);
  return (
    <Svg height={12} viewBox="0 0 24 24" width={12}>
      <Path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M16 13H8 M16 17H8 M10 9H8"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
};

const statusVariant = {
  Paid: "default",
  Due: "secondary",
  Overdue: "destructive",
} as const;

const rows = [
  { name: "Alice Martin", role: "Engineer", status: "Active" },
  { name: "Bruno Petit", role: "Designer", status: "Away" },
  { name: "Chloé Bernard", role: "Product", status: "Active" },
];

const TERMS_MARKDOWN = `# Terms of service

Last updated **November 2, 2026**. These terms govern your use of the *Acme Studio* platform and the services described in your [order form](https://acme.studio/order).

## 1. Services

We provide the design and development services listed in the quote you accepted. Unless agreed otherwise in writing:

1. Work starts after the deposit is received.
2. Each milestone includes **two rounds of revisions**.
   - Extra rounds are billed at the daily rate.
   - Requests made after delivery are a new project.
3. Deliverables are handed over through a shared repository.

> Delays caused by missing content or late feedback move the delivery date by the same amount of time.

## 2. Fees and payment

| Milestone | Share | Due |
| :-- | --: | --: |
| Deposit | 30% | On signature |
| Design sign-off | 40% | 30 days |
| Delivery | 30% | 30 days |

Late payments incur a penalty of three times the legal interest rate, plus a fixed fee of 40 euros for recovery costs, as required by article L441-10 of the French Commercial Code.

## 3. Intellectual property

Ownership of the deliverables transfers to the client once the final invoice is paid in full. The studio keeps the right to show the work in its portfolio, unless the client asks otherwise.

### Third-party assets

Fonts, icons and stock images remain under their own licenses. The client receives the license terms with the deliverables:

- [x] Fonts: commercial desktop and web licenses
- [ ] Stock photography: to be purchased by the client

## 4. Technical setup

Environment variables are documented in the repository:

\`\`\`bash
pnpm install
cp .env.example .env.local
pnpm dev
\`\`\`

---

Questions about these terms? Write to \`legal@acme.studio\`.
`;

export const componentPreviews = {
  alert: (
    <Sheet>
      <Block className="gap-4">
        <Alert icon={<AlertIconCheck />}>
          <AlertTitle>Payment received</AlertTitle>
          <AlertDescription>
            Invoice INV-2041 was paid in full on November 2, 2026.
          </AlertDescription>
        </Alert>
        <Alert icon={<AlertIconInfo />}>
          <AlertTitle>Prices include VAT at 20%</AlertTitle>
        </Alert>
        <Alert icon={<AlertIconWarning />} variant="destructive">
          <AlertTitle>Payment overdue</AlertTitle>
          <AlertDescription>
            Please settle the outstanding balance of € 920.00 within 7 days to
            avoid late fees.
          </AlertDescription>
        </Alert>
      </Block>
    </Sheet>
  ),
  avatar: (
    <Sheet>
      <Block className="flex-row items-center gap-4">
        <Avatar size="sm">
          <AvatarFallback>AM</AvatarFallback>
          <AvatarImage src={asset("avatar-1.png")} />
        </Avatar>
        <Avatar>
          <AvatarFallback>AM</AvatarFallback>
          <AvatarImage src={asset("avatar-1.png")} />
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>AM</AvatarFallback>
          <AvatarImage src={asset("avatar-1.png")} />
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>DR</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>DR</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>DR</AvatarFallback>
        </Avatar>
      </Block>
      <AvatarGroup>
        {people.map((person) => (
          <Avatar key={person.name} size="lg">
            <AvatarFallback>{person.initials}</AvatarFallback>
            {person.image ? <AvatarImage src={person.image} /> : null}
          </Avatar>
        ))}
        <Avatar size="lg">
          <AvatarFallback>+3</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    </Sheet>
  ),
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
  item: (
    <Sheet>
      <ItemGroup>
        {invoices.map((invoice, index) => (
          <Block key={invoice.number}>
            {index > 0 && <ItemSeparator />}
            <Item size="sm">
              <ItemMedia variant="icon">
                <FileIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{invoice.client}</ItemTitle>
                <ItemDescription>
                  {invoice.number} · {invoice.due}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant={statusVariant[invoice.status]}>
                  {invoice.status}
                </Badge>
                <Text className="w-20 text-right font-medium">
                  {invoice.amount}
                </Text>
              </ItemActions>
            </Item>
          </Block>
        ))}
      </ItemGroup>
      <Block className="gap-4">
        <Item variant="outline">
          <ItemMedia variant="image">
            <Image className="size-full" src={asset("avatar-2.png")} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Bruno Petit</ItemTitle>
            <ItemDescription>
              Account manager · bruno@acme.studio
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Badge variant="outline">Owner</Badge>
          </ItemActions>
        </Item>
        <Item variant="muted">
          <ItemContent>
            <ItemTitle>Total outstanding</ItemTitle>
            <ItemDescription>2 invoices awaiting payment</ItemDescription>
          </ItemContent>
          <ItemActions className="font-semibold text-base">
            € 2,100.00
          </ItemActions>
        </Item>
      </Block>
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
  typeset: (
    <Sheet>
      <Typeset>
        <TypesetHeading level={1}>Project proposal</TypesetHeading>
        <TypesetParagraph>
          Thanks for your time last week. Here is how we would approach the
          redesign of the <TypesetStrong>Maison Verdier</TypesetStrong> online
          store, based on what we discussed.
        </TypesetParagraph>
        <TypesetHeading level={2}>Approach</TypesetHeading>
        <TypesetList>
          <TypesetListItem>
            <TypesetParagraph>
              A two-day discovery workshop with your team.
            </TypesetParagraph>
          </TypesetListItem>
          <TypesetListItem>
            <TypesetParagraph>
              A design system built in Figma and shipped as{" "}
              <TypesetCode>@verdier/ui</TypesetCode>.
            </TypesetParagraph>
          </TypesetListItem>
          <TypesetListItem>
            <TypesetParagraph>
              Weekly demos, with a staging link you can share.
            </TypesetParagraph>
          </TypesetListItem>
        </TypesetList>
        <TypesetBlockquote>
          <TypesetParagraph>
            The best time to fix a checkout is before the holiday season.
          </TypesetParagraph>
        </TypesetBlockquote>
        <TypesetParagraph>
          The full quote is attached; see also our{" "}
          <TypesetLink href="https://acme.studio/terms">terms</TypesetLink>.
        </TypesetParagraph>
      </Typeset>
    </Sheet>
  ),
  "typeset-markdown": (
    <Document>
      <Page className="bg-background px-10 pt-10 pb-12" size="A5">
        <TypesetMarkdown>{TERMS_MARKDOWN}</TypesetMarkdown>
      </Page>
    </Document>
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
