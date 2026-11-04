import { Document, Page, Text } from "@ui-registries/pdf";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../registry/base-nova/pdf/card";

export default function CardExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
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
      </Page>
    </Document>
  );
}
