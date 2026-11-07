import { TechBadges } from "@/components/tech-badges";
import { kitComponent } from "@/lib/kit";
import { techsForDependencies } from "@/lib/tech";

/** "Under the hood" badges for a kit component, from its registry item. */
export function KitComponentBadges({ name }: { name: string }) {
  const component = kitComponent(name);
  if (!component) {
    return null;
  }
  return <TechBadges techs={techsForDependencies(component.dependencies)} />;
}
