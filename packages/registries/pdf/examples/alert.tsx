import { Block, Document, Page } from "@ui-registries/pdf";

import {
  Alert,
  AlertDescription,
  AlertIconCheck,
  AlertIconInfo,
  AlertIconWarning,
  AlertTitle,
} from "../registry/base-nova/pdf/alert";

export default function AlertExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
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
      </Page>
    </Document>
  );
}
