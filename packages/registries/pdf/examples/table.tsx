import { Document, Page } from "@ui-registries/pdf";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../registry/base-nova/pdf/table";

const rows = [
  { name: "Alice Martin", role: "Engineer", status: "Active" },
  { name: "Bruno Petit", role: "Designer", status: "Away" },
  { name: "Chloé Bernard", role: "Product", status: "Active" },
];

export default function TableExample() {
  return (
    <Document>
      <Page className="gap-6 bg-background p-10 text-sm" size={{ width: 420 }}>
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
      </Page>
    </Document>
  );
}
