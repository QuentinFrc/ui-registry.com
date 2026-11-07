import { Block, Document, Page, Text } from "@ui-registries/pdf";
import { Separator } from "../registry/base-nova/pdf/separator";

export default function SeparatorExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
        <Text>Above the separator</Text>
        <Separator />
        <Block className="h-10 flex-row items-center gap-4">
          <Text>Left</Text>
          <Separator orientation="vertical" />
          <Text>Right</Text>
        </Block>
      </Page>
    </Document>
  );
}
