import { readFileSync } from "node:fs";
import { join } from "node:path";

interface RegistryFile {
  content: string;
  path: string;
  type: string;
}

interface RegistryItem {
  description: string;
  files: RegistryFile[];
  name: string;
  registryDependencies?: string[];
  title: string;
  type: string;
}

interface RegistryIndex {
  generatedAt: string;
  registries: {
    name: string;
    homepage: string;
    items: {
      name: string;
      type: string;
      title: string;
      description: string;
      categories: string[];
    }[];
  }[];
  totalItems: number;
}

const publicDir = join(process.cwd(), "public/r");

export function getRegistryIndex(): RegistryIndex {
  const raw = readFileSync(join(publicDir, "index.json"), "utf-8");
  return JSON.parse(raw);
}

export function getRegistryItem(
  registry: string,
  name: string
): RegistryItem | null {
  try {
    const raw = readFileSync(
      join(publicDir, registry, `${name}.json`),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
