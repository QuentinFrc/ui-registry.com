import type { ResumeData } from "./resume";

export const exampleResume: ResumeData = {
  certifications: [
    {
      date: new Date("2025-03-01"),
      issuer: "Amazon Web Services",
      name: "AWS Certified Solutions Architect – Associate",
    },
    {
      date: new Date("2023-06-01"),
      issuer: "W3C / WAI",
      name: "Web Accessibility Specialist (WAS)",
    },
  ],
  education: [
    {
      degree: "MSc Computer Science — Human-Computer Interaction",
      details: "Thesis on latency perception in collaborative editors.",
      end: new Date("2015-09-01"),
      location: "Paris",
      school: "Université Paris-Saclay",
      start: new Date("2013-09-01"),
    },
    {
      degree: "BSc Mathematics & Computer Science",
      end: new Date("2013-06-01"),
      location: "Lyon",
      school: "Université Claude Bernard Lyon 1",
      start: new Date("2010-09-01"),
    },
  ],
  email: "camille.durand@hey.com",
  experience: [
    {
      company: "Lumen Health",
      highlights: [
        "Lead a squad of 6 engineers shipping the clinician scheduling suite used by 2,400 clinics across France and Belgium.",
        "Drove the migration from a Rails monolith to a Next.js + tRPC front end, cutting p75 page load from 3.1 s to 1.2 s.",
        "Introduced a typed design system (React, Tailwind, Storybook) now shared by 4 product teams.",
      ],
      location: "Paris",
      role: "Senior Product Engineer",
      start: new Date("2022-04-01"),
    },
    {
      company: "Qonto",
      highlights: [
        "Built the expense-report flow end to end, from receipt OCR to accounting exports, adopted by 60k SMEs.",
        "Owned web performance budgets and CI checks; reduced JS shipped on the dashboard by 38%.",
        "Mentored 4 junior engineers, two of whom were promoted within a year.",
      ],
      location: "Paris",
      role: "Product Engineer",
      end: new Date("2022-03-01"),
      start: new Date("2019-01-01"),
    },
    {
      company: "Atelier Nord",
      highlights: [
        "Delivered 15+ web apps and design systems for clients in retail, media and the public sector.",
        "Set up the agency's front-end stack and accessibility audit process (RGAA / WCAG 2.1 AA).",
      ],
      location: "Lille",
      role: "Front-end Developer",
      end: new Date("2018-12-01"),
      start: new Date("2015-10-01"),
    },
  ],
  headline: "Senior Product Engineer · React, TypeScript & design systems",
  languages: [
    { level: "Native", name: "French", rating: 5 },
    { level: "Professional (C1)", name: "English", rating: 4 },
    { level: "Conversational (B1)", name: "Spanish", rating: 3 },
  ],
  links: [
    { label: "camilledurand.dev", url: "https://camilledurand.dev" },
    {
      label: "linkedin.com/in/camille-durand",
      url: "https://www.linkedin.com/in/camille-durand",
    },
    { label: "github.com/cdurand", url: "https://github.com/cdurand" },
  ],
  locale: "en-US",
  location: "Paris, France",
  name: "Camille Durand",
  phone: "+33 6 12 34 56 78",
  projects: [
    {
      description:
        "Open-source library of accessible, headless form primitives for React. 3k stars on GitHub.",
      name: "formkit-a11y",
      stack: ["React", "TypeScript", "Vitest"],
      url: "https://github.com/cdurand/formkit-a11y",
    },
    {
      description:
        "Talk at React Paris 2025 on shipping a design system across four product teams without a rewrite.",
      name: "Design systems that scale",
      url: "https://camilledurand.dev/talks/design-systems",
    },
  ],
  skills: [
    {
      items: ["TypeScript", "React", "Next.js", "Node.js", "tRPC", "GraphQL"],
      name: "Engineering",
    },
    {
      items: ["Design systems", "Accessibility", "Web performance", "Figma"],
      name: "Product & UX",
    },
    {
      items: ["PostgreSQL", "AWS", "Vercel", "GitHub Actions"],
      name: "Platform",
    },
  ],
  summary:
    "Product engineer with 10 years of experience building web products people rely on every day. I sit between design and engineering: I turn fuzzy problems into well-scoped releases, care deeply about accessibility and performance, and help teams ship faster through shared tooling and design systems.",
};
