// Preview documents for every pdf registry item, one example file each in
// examples/. Shared by the docs (images + source shown under each preview),
// the pdf:render script and the visual tests. Never installed by consumers.
import type { ReactElement } from "react";

import AlertExample from "./examples/alert";
import AvatarExample from "./examples/avatar";
import BadgeExample from "./examples/badge";
import CardExample from "./examples/card";
import CertificateExample from "./examples/certificate";
import HeadingExample from "./examples/heading";
import InvoiceExample from "./examples/invoice";
import ItemExample from "./examples/item";
import PageFooterExample from "./examples/page-footer";
import QuoteExample from "./examples/quote";
import ReceiptExample from "./examples/receipt";
import ReportExample from "./examples/report";
import ResumeExample from "./examples/resume";
import SeparatorExample from "./examples/separator";
import TableExample from "./examples/table";
import TypesetExample from "./examples/typeset";
import TypesetMarkdownExample from "./examples/typeset-markdown";

export const componentPreviews = {
  alert: <AlertExample />,
  avatar: <AvatarExample />,
  badge: <BadgeExample />,
  card: <CardExample />,
  heading: <HeadingExample />,
  item: <ItemExample />,
  "page-footer": <PageFooterExample />,
  separator: <SeparatorExample />,
  table: <TableExample />,
  typeset: <TypesetExample />,
  "typeset-markdown": <TypesetMarkdownExample />,
} satisfies Record<string, ReactElement>;

// Full documents. Each one gets a thumbnail in the docs block grid.
export const blockPreviews = {
  certificate: <CertificateExample />,
  invoice: <InvoiceExample />,
  quote: <QuoteExample />,
  receipt: <ReceiptExample />,
  report: <ReportExample />,
  resume: <ResumeExample />,
} satisfies Record<string, ReactElement>;

export const previews = { ...componentPreviews, ...blockPreviews };

export type PreviewName = keyof typeof previews;
export type BlockName = keyof typeof blockPreviews;
