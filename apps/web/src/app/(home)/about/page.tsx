import Link from "next/link";
import { siteConfig } from "@/lib/site.config";

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16 sm:py-24">
      <h1 className="font-semibold text-3xl tracking-tight">About</h1>
      <p className="text-muted-foreground leading-relaxed">
        {siteConfig.name} is a personal technical portfolio — headless libraries
        extracted from real client work, packaged with their shadcn-compatible
        UI counterparts, presented as case studies.
      </p>
      <p className="text-muted-foreground leading-relaxed">
        Built and maintained by {siteConfig.author.name}.
      </p>
      <Link className="text-sm underline hover:text-foreground" href="/">
        ← Home
      </Link>
    </main>
  );
}
