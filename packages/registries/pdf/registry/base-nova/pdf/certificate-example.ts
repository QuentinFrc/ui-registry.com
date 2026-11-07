import type { CertificateData } from "./certificate";

export const exampleCertificate: CertificateData = {
  achievement: "Advanced React & TypeScript for Product Teams",
  credentialId: "NWA-2026-RT-04821",
  description:
    "A 40-hour professional program covering component architecture, type-safe APIs, performance and accessibility, completed with distinction.",
  issueDate: new Date("2026-10-16"),
  issuer: "Northwind Academy",
  locale: "en-US",
  recipient: "Élise Marchand",
  seal: { caption: "Certified", text: "2026" },
  signatures: [
    { name: "Margaret Chen", role: "Program Director" },
    { name: "Daniel Okafor", role: "Head of Curriculum" },
  ],
  verifyUrl: "https://northwind.academy/verify/NWA-2026-RT-04821",
};
