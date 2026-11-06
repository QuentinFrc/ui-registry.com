import { Quote } from "../registry/base-nova/pdf/quote";
import { exampleQuote } from "../registry/base-nova/pdf/quote-example";

export default function QuoteExample() {
  return <Quote data={exampleQuote} />;
}
