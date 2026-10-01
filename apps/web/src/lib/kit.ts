import registryJson from "@registry/kit/registry.json";

export type KitOrigin = "shadcn" | "kit";

export interface KitComponent {
  dependencies: readonly string[];
  description: string;
  name: string;
  origin: KitOrigin;
  title: string;
}

interface RegistryItemLike {
  dependencies?: string[];
  description?: string;
  meta?: Record<string, unknown>;
  name: string;
  title?: string;
}

// The JSON import is typed from its current content; widen it to the shape
// every kit item can have (meta.origin is set per component).
const registry = registryJson as { items: RegistryItemLike[] };

export const KIT_INSTALL_BASE = "https://ui-registry.com/r/kit";

const KIT_STYLE_ITEM = "kit";

const isOrigin = (value: unknown): value is KitOrigin =>
  value === "shadcn" || value === "kit";

/** Every component the kit ships, in registry order. */
export const kitComponents = (): readonly KitComponent[] =>
  registry.items.flatMap((item) => {
    if (item.name === KIT_STYLE_ITEM) {
      return [];
    }
    const origin = isOrigin(item.meta?.origin) ? item.meta.origin : "kit";
    return [
      {
        name: item.name,
        dependencies: item.dependencies ?? [],
        title: item.title ?? item.name,
        description: item.description ?? "",
        origin,
      },
    ];
  });

export const kitComponent = (name: string): KitComponent | undefined =>
  kitComponents().find((component) => component.name === name);

export const kitComponentHref = (name: string) => `/kit/${name}`;
