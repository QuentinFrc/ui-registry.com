import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./global.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={inter.className} lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
