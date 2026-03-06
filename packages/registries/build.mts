import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const rootDir = resolve(import.meta.dirname);
const distDir = join(rootDir, "dist");

function findRegistries(): string[] {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  const registries: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const registryJson = join(rootDir, entry.name, "registry.json");
    if (existsSync(registryJson)) {
      registries.push(entry.name);
    }
  }

  return registries;
}

function buildRegistry(name: string) {
  const registryDir = join(rootDir, name);
  const outputDir = join(distDir, name);

  console.log(`Building registry: ${name}`);

  execSync(`pnpm shadcn build -c ${registryDir} -o ${outputDir}`, {
    cwd: registryDir,
    stdio: "inherit",
  });

  console.log(`Built registry "${name}" → dist/${name}/`);
}

const registries = findRegistries();

if (registries.length === 0) {
  console.log("No registries found.");
  process.exit(0);
}

console.log(
  `Found ${registries.length} registr${registries.length === 1 ? "y" : "ies"}: ${registries.join(", ")}`
);

for (const name of registries) {
  buildRegistry(name);
}

console.log("All registries built successfully.");
