import { siBaseui, siLucide, siShadcnui, siTailwindcss } from "simple-icons";

export type TechId = "base-ui" | "shadcn" | "tailwind" | "lucide";

export interface Tech {
  href: string;
  /** SVG path on a 24×24 viewBox, from simple-icons. */
  iconPath: string;
  label: string;
}

/** The libraries ui-registry builds on. One place for names, links and logos. */
export const TECH: Record<TechId, Tech> = {
  "base-ui": {
    label: "Base UI",
    href: "https://base-ui.com",
    iconPath: siBaseui.path,
  },
  shadcn: {
    label: "shadcn",
    href: "https://ui.shadcn.com",
    iconPath: siShadcnui.path,
  },
  tailwind: {
    label: "Tailwind CSS",
    href: "https://tailwindcss.com",
    iconPath: siTailwindcss.path,
  },
  lucide: {
    label: "Lucide",
    href: "https://lucide.dev",
    iconPath: siLucide.path,
  },
};

/** npm packages a registry item can depend on, mapped to the lib badge. */
const TECH_BY_PACKAGE: Record<string, TechId> = {
  "@base-ui/react": "base-ui",
  "lucide-react": "lucide",
};

/** Libraries under the hood of a kit component, from its npm dependencies. */
export const techsForDependencies = (
  dependencies: readonly string[]
): readonly TechId[] => {
  const techs = new Set<TechId>(["tailwind"]);
  for (const dependency of dependencies) {
    const tech = TECH_BY_PACKAGE[dependency];
    if (tech) {
      techs.add(tech);
    }
  }
  return [...techs].sort(
    (a, b) => TECH_ORDER.indexOf(a) - TECH_ORDER.indexOf(b)
  );
};

const TECH_ORDER: readonly TechId[] = [
  "base-ui",
  "shadcn",
  "tailwind",
  "lucide",
];
