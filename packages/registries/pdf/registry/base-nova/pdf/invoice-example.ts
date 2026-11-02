import type { InvoiceData } from "./invoice";

export const exampleInvoice: InvoiceData = {
  currency: "EUR",
  dueDate: new Date("2026-12-01"),
  from: {
    lines: ["12 rue de la Paix", "75002 Paris", "hello@acme.studio"],
    name: "Acme Studio",
  },
  issueDate: new Date("2026-11-01"),
  items: [
    {
      description: "Product design — discovery workshop",
      quantity: 1,
      unitPrice: 1800,
    },
    { description: "UI design — 12 screens", quantity: 12, unitPrice: 350 },
    { description: "Design system setup", quantity: 1, unitPrice: 2400 },
    {
      description: "Front-end integration (days)",
      quantity: 6,
      unitPrice: 650,
    },
  ],
  locale: "fr-FR",
  notes:
    "Payment by bank transfer within 30 days. IBAN FR76 3000 6000 0112 3456 7890 189.",
  number: "INV-2026-042",
  status: "due",
  taxRate: 20,
  to: {
    lines: ["Globex Corporation", "8 avenue des Champs-Élysées", "75008 Paris"],
    name: "Jane Cooper",
  },
};
