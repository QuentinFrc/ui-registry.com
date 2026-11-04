import { Block, Document, Page } from "@ui-registries/pdf";
import { Badge } from "../registry/base-nova/pdf/badge";

export default function BadgeExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
        <Block className="flex-row gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </Block>
      </Page>
    </Document>
  );
}
