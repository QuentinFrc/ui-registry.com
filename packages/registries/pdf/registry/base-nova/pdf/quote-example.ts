import type { QuoteData } from "./quote";

export const exampleQuote: QuoteData = {
  currency: "EUR",
  discount: { type: "percent", value: 10 },
  from: {
    lines: [
      "12 rue de la Paix",
      "75002 Paris",
      "hello@acme.studio",
      "SIRET 842 123 456 00017",
    ],
    name: "Acme Studio",
  },
  intro:
    "Following our call on October 24th, here is our proposal for the redesign of your online store: a short discovery phase, a new design system, then the catalogue and checkout, delivered as a Next.js front end.",
  issueDate: new Date("2026-11-02"),
  items: [
    {
      description: "Discovery workshop",
      detail: "Stakeholder interviews and UX audit",
      quantity: 2,
      unit: "day",
      unitPrice: 900,
    },
    {
      description: "Design system",
      detail: "Tokens, typography, 30+ components in Figma",
      quantity: 1,
      unit: "package",
      unitPrice: 3200,
    },
    {
      description: "UI design — catalogue & checkout",
      detail: "Desktop and mobile, two rounds of feedback",
      quantity: 14,
      unit: "screen",
      unitPrice: 350,
    },
    {
      description: "Front-end development",
      detail: "Next.js, Shopify Storefront API, accessibility audit",
      quantity: 12,
      unit: "day",
      unitPrice: 650,
    },
    {
      description: "Project management",
      quantity: 3,
      unit: "day",
      unitPrice: 550,
    },
  ],
  locale: "fr-FR",
  number: "Q-2026-118",
  project: "E-commerce redesign — Maison Verdier",
  status: "sent",
  taxRate: 20,
  terms: [
    "A 30% deposit is due on acceptance, the balance on delivery.",
    "Work outside the scope above is quoted separately.",
    "Rights are transferred to the client upon full payment.",
  ],
  to: {
    lines: ["Maison Verdier SAS", "45 cours Lafayette", "69003 Lyon"],
    name: "Claire Verdier",
  },
  validUntil: new Date("2026-12-02"),
};
