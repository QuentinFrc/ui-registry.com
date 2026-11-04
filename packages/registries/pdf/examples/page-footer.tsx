import { Document, Page, Text } from "@ui-registries/pdf";
import { PageFooter } from "../registry/base-nova/pdf/page-footer";

export default function PageFooterExample() {
  return (
    <Document>
      <Page
        className="gap-6 bg-background p-10 text-sm"
        size={{ width: 420, height: 420 }}
      >
        <Text>The footer is repeated at the bottom of every page.</Text>
        <PageFooter>Acme Studio · Annual report</PageFooter>
      </Page>
    </Document>
  );
}
