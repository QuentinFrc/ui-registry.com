import type { ReceiptData } from "./receipt";

export const exampleReceipt: ReceiptData = {
  currency: "EUR",
  items: [
    {
      description: "Ethiopia Yirgacheffe — 250 g",
      quantity: 2,
      unitPrice: 14.5,
    },
    { description: "Colombia Huila — 1 kg", quantity: 1, unitPrice: 42 },
    { description: "V60 paper filters (x100)", quantity: 1, unitPrice: 7.9 },
    { description: "Ceramic dripper", quantity: 1, unitPrice: 29 },
    { description: "Flat white", quantity: 2, unitPrice: 4.8 },
  ],
  locale: "fr-FR",
  merchant: {
    lines: [
      "27 rue de Bretagne, 75003 Paris",
      "bonjour@maisonlumiere.fr",
      "TVA FR 32 912 345 678",
    ],
    name: "Maison Lumière — Coffee roasters",
  },
  message: "Thank you for your visit — see you soon!",
  number: "R-2026-08714",
  paidAt: new Date("2026-11-02T14:32:00+01:00"),
  paymentMethod: "Visa •••• 4242",
  pricesIncludeTax: true,
  taxRate: 20,
  timeZone: "Europe/Paris",
};
