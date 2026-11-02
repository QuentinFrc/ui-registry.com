import type { ReportData } from "./report";

const month = (index: number) => new Date(2025, 10 + index, 1);

export const exampleReport: ReportData = {
  barChart: {
    description: "Monthly recurring revenue, last 12 months",
    format: "currency",
    points: [
      312_400, 324_900, 331_200, 347_800, 356_100, 371_500, 384_200, 398_700,
      412_300, 431_900, 452_600, 482_300,
    ].map((value, i) => ({ label: month(i), value })),
    title: "Recurring revenue",
  },
  breakdown: {
    description: "MRR by acquisition channel, October vs. September",
    format: "currency",
    rows: [
      { label: "Sales-led (enterprise)", previous: 176_400, value: 189_200 },
      { label: "Self-serve", previous: 121_800, value: 134_500 },
      { label: "Partners & resellers", previous: 68_300, value: 74_900 },
      { label: "Marketplace (AWS, Azure)", previous: 49_200, value: 51_600 },
      { label: "Expansion (upsell)", previous: 25_400, value: 22_700 },
      { label: "Education & non-profit", previous: 11_500, value: 9400 },
    ],
    title: "Revenue by channel",
  },
  company: "Northwind Analytics",
  currency: "USD",
  date: new Date(2026, 10, 2),
  highlights: [
    "MRR grew 6.6% month over month to $482K, the strongest month since launch.",
    "Enterprise closed 4 new logos, including two Fortune 500 accounts.",
    "Logo churn fell to 1.8% after the onboarding revamp shipped in September.",
    "Net revenue retention reached 118%, up 3 points quarter over quarter.",
  ],
  kpis: [
    {
      format: "currency",
      label: "Monthly recurring revenue",
      previous: 452_600,
      value: 482_300,
    },
    {
      format: "number",
      label: "Active customers",
      previous: 2318,
      value: 2464,
    },
    {
      format: "currency",
      label: "Revenue per account",
      previous: 195.3,
      value: 195.7,
    },
    {
      format: "percent",
      label: "Logo churn",
      lowerIsBetter: true,
      previous: 0.023,
      value: 0.018,
    },
  ],
  lineChart: {
    description: "Monthly active users across all workspaces",
    format: "number",
    points: [
      38_200, 39_100, 41_800, 43_500, 42_900, 45_600, 48_300, 50_100, 49_400,
      53_200, 56_800, 61_400,
    ].map((value, i) => ({ label: month(i), value })),
    title: "Active users",
  },
  locale: "en-US",
  nextSteps: [
    "Roll out usage-based pricing to self-serve plans by mid-November.",
    "Hire two account executives for the EMEA enterprise segment.",
    "Launch the partner certification program with three pilot resellers.",
    "Investigate the expansion dip: review seat downgrades in Q4 renewals.",
  ],
  period: "October 2026",
  preparedBy: "Maya Chen, Finance",
  preparedFor: "Board of Directors",
  title: "Monthly Business Review",
};
