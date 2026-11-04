import { Invoice } from "../registry/base-nova/pdf/invoice";
import { exampleInvoice } from "../registry/base-nova/pdf/invoice-example";

export default function InvoiceExample() {
  return <Invoice data={exampleInvoice} />;
}
