export const siteConfig = {
  name: "ui-registry",
  description:
    "Headless libraries extracted from real client engagements, paired with shadcn-compatible UI — as case studies.",
  url: "https://ui-registry.com",
  github: {
    user: "QuentinFrc",
    repo: "ui-registry",
    branch: "main",
  },
  author: {
    name: "Quentin",
    malt: "https://www.malt.fr",
  },
  // Card shown in the right column of every docs page.
  sponsor: {
    href: "https://quent1.com/?utm_source=ui-registry&utm_medium=referral&utm_campaign=docs-sponsor-card",
    eyebrow: "Built by Quentin",
    title: "Need this in your product?",
    description:
      "These packages come from real client work. I help teams ship design systems, document generation and polished React UIs.",
    cta: "Work with me",
  },
} as const;
