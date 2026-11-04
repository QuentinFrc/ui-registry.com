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
import { Badge } from "../registry/base-nova/pdf/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "../registry/base-nova/pdf/item";

// Local images only: previews are rendered offline (scripts and tests).
const asset = (file: string) => join(import.meta.dirname, "..", "assets", file);

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

export default function ItemExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
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
      </Page>
    </Document>
  );
}
