import Link from "next/link";
import { Bounds } from "@/components/bounds";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { LaneIntro } from "@/components/catalog/lane-intro";
import { CodeBlock } from "@/components/code-block";
import { KitGrid } from "@/components/kit/kit-grid";
import { KIT_INSTALL_BASE, kitComponents } from "@/lib/kit";

export const metadata = {
  title: "Kit",
  description:
    "shadcn, upgraded for building real apps and scaling them — richer parts and variants, explicit UX behaviours, code that holds up as the app grows.",
};

export default function KitPage() {
  const components = kitComponents();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
      <Bounds>
        <Link
          className="w-fit font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          href="/"
        >
          ← Home
        </Link>
      </Bounds>

      <Bounds>
        <LaneIntro kind="kit" />
      </Bounds>

      <Bounds>
        <div className="flex flex-col gap-3">
          <h2 className="font-medium font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            Install
          </h2>
          <CodeBlock
            code={`# one component — an upgrade overrides the shadcn file of the same name
pnpm dlx shadcn@latest add ${KIT_INSTALL_BASE}/dialog.json

# or register the namespace once in components.json
"registries": { "@kit": "${KIT_INSTALL_BASE}/{name}.json" }
pnpm dlx shadcn@latest add @kit/dialog

# the whole set, on a fresh project
pnpm dlx shadcn@latest init @kit/kit`}
            lang="sh"
          />
        </div>
      </Bounds>

      {components.length === 0 ? (
        <CatalogGrid emptyKind="kit" entries={[]} />
      ) : (
        <Bounds>
          <KitGrid />
        </Bounds>
      )}
    </main>
  );
}
