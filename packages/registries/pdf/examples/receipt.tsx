import { Receipt } from "../registry/base-nova/pdf/receipt";
import { exampleReceipt } from "../registry/base-nova/pdf/receipt-example";

export default function ReceiptExample() {
  return <Receipt data={exampleReceipt} />;
}
