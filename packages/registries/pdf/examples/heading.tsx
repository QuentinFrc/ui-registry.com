import { Document, Page } from "@ui-registries/pdf";
import { Heading } from "../registry/base-nova/pdf/heading";

export default function HeadingExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
        <Heading level={1}>Heading 1</Heading>
        <Heading level={2}>Heading 2</Heading>
        <Heading level={3}>Heading 3</Heading>
        <Heading level={4}>Heading 4</Heading>
      </Page>
    </Document>
  );
}
