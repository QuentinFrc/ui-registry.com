import { exec } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { registryItemSchema } from "shadcn/schema";
import { validate } from "./validate.mjs";

const execAsync = promisify(exec);
const rootDir = resolve(import.meta.dirname);
const distDir = join(rootDir, "dist");

interface BuildResult {
  durationMs: number;
  error?: string;
  name: string;
  ok: boolean;
}

function findRegistries(): string[] {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  const registries: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (existsSync(join(rootDir, entry.name, "registry.json"))) {
      registries.push(entry.name);
    }
  }

  return registries;
}

async function buildRegistry(name: string): Promise<BuildResult> {
  const registryDir = join(rootDir, name);
  const outputDir = join(distDir, name);
  const start = performance.now();

  try {
    await execAsync(`pnpm shadcn build -c ${registryDir} -o ${outputDir}`, {
      cwd: registryDir,
    });
    return {
      name,
      ok: true,
      durationMs: performance.now() - start,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      durationMs: performance.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function postValidate(registries: string[]): boolean {
  let ok = true;

  for (const name of registries) {
    const registryDir = join(rootDir, name);
    const outputDir = join(distDir, name);
    const registryJson = JSON.parse(
      readFileSync(join(registryDir, "registry.json"), "utf-8")
    );

    for (const item of registryJson.items) {
      const outputFile = join(outputDir, `${item.name}.json`);
      if (!existsSync(outputFile)) {
        console.error(`  ✗ Missing output: ${name}/${item.name}.json`);
        ok = false;
        continue;
      }

      const content = JSON.parse(readFileSync(outputFile, "utf-8"));
      const result = registryItemSchema.safeParse(content);
      if (!result.success) {
        console.error(`  ✗ Invalid output: ${name}/${item.name}.json`);
        for (const issue of result.error.issues) {
          console.error(`    - ${issue.path.join(".")}: ${issue.message}`);
        }
        ok = false;
      }
    }
  }

  return ok;
}

interface IndexItem {
  categories?: string[];
  description?: string;
  name: string;
  title?: string;
  type: string;
}

interface IndexRegistry {
  homepage: string;
  items: IndexItem[];
  name: string;
}

interface RegistryIndex {
  generatedAt: string;
  registries: IndexRegistry[];
  totalItems: number;
}

function generateIndex(registries: string[]): RegistryIndex {
  const indexRegistries: IndexRegistry[] = [];
  let totalItems = 0;

  for (const name of registries) {
    const registryJson = JSON.parse(
      readFileSync(join(rootDir, name, "registry.json"), "utf-8")
    );

    const items: IndexItem[] = registryJson.items.map(
      (item: {
        name: string;
        type: string;
        title?: string;
        description?: string;
        categories?: string[];
      }) => {
        totalItems++;
        return {
          name: item.name,
          type: item.type,
          title: item.title,
          description: item.description,
          categories: item.categories ?? [],
        };
      }
    );

    indexRegistries.push({
      name: registryJson.name,
      homepage: registryJson.homepage,
      items,
    });
  }

  return {
    registries: indexRegistries,
    generatedAt: new Date().toISOString(),
    totalItems,
  };
}

// --- Main ---

const totalStart = performance.now();

// Step 1: Pre-build validation
console.log("--- Pre-build validation ---\n");
const { ok: validationOk } = validate();
if (!validationOk) {
  process.exit(1);
}

// Step 2: Discover registries
const registries = findRegistries();
if (registries.length === 0) {
  console.log("No registries found.");
  process.exit(0);
}

// Step 3: Clean dist/
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

// Step 4: Build all registries in parallel
console.log("\n--- Building registries ---\n");
const results = await Promise.allSettled(
  registries.map((name) => buildRegistry(name))
);

const buildResults: BuildResult[] = [];
for (const result of results) {
  if (result.status === "fulfilled") {
    buildResults.push(result.value);
  }
}

for (const r of buildResults) {
  const time = `${r.durationMs.toFixed(0)}ms`;
  if (r.ok) {
    console.log(`  ✓ ${r.name} (${time})`);
  } else {
    console.error(`  ✗ ${r.name} (${time})`);
    console.error(`    ${r.error}`);
  }
}

const failed = buildResults.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(
    `\n${failed.length} registr${failed.length === 1 ? "y" : "ies"} failed to build.`
  );
  process.exit(1);
}

// Step 5: Post-build validation
console.log("\n--- Post-build validation ---\n");
const successfulRegistries = buildResults
  .filter((r) => r.ok)
  .map((r) => r.name);

const postOk = postValidate(successfulRegistries);
if (!postOk) {
  console.error("\nPost-build validation failed.");
  process.exit(1);
}
console.log("  All outputs valid.");

// Step 6: Generate index
console.log("\n--- Generating index ---\n");
const index = generateIndex(successfulRegistries);
writeFileSync(join(distDir, "index.json"), JSON.stringify(index, null, 2));
console.log(
  `  Generated dist/index.json (${index.registries.length} registries, ${index.totalItems} items)`
);

// Done
const totalTime = ((performance.now() - totalStart) / 1000).toFixed(2);
console.log(`\nDone in ${totalTime}s.`);
