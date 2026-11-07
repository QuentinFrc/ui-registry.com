import Link from "next/link";
import { kitIllustration } from "@/components/kit/illustrations";
import { type KitComponent, kitComponentHref, kitComponents } from "@/lib/kit";

const KitCard = ({ component }: { component: KitComponent }) => {
  const Illustration = kitIllustration(component.name);
  return (
    <Link
      className="group flex flex-col"
      href={kitComponentHref(component.name)}
    >
      <div className="relative aspect-video w-full overflow-hidden border border-border/60 bg-muted transition-colors group-hover:border-border">
        <Illustration />
      </div>
      <span className="px-1 pt-3 pb-8 font-medium font-mono text-muted-foreground text-xs transition-colors group-hover:text-foreground">
        {component.name}
      </span>
    </Link>
  );
};

export function KitGrid() {
  const components = kitComponents();
  return (
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
      {components.map((component) => (
        <KitCard component={component} key={component.name} />
      ))}
    </div>
  );
}
