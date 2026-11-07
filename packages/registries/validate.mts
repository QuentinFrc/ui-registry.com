import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { registrySchema } from "shadcn/schema";
import { checkKit } from "./kit/check.mjs";

const rootDir = resolve(import.meta.dirname);

/** Matches cross-registry references such as https://ui-registry.com/r/kit/dialog.json */
const INTERNAL_DEPENDENCY_URL =
  /^https:\/\/ui-registry\.com\/r\/([^/]+)\/([^/]+)\.json$/;

interface ValidationError {
  errors: string[];
  registry: string;
}

interface ParsedRegistry {
  dependencies: { from: string; url: string }[];
  itemNames: Set<string>;
  name: string;
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

function validateRegistry(name: string): {
  errors: string[];
  parsed: ParsedRegistry | null;
} {
  const registryDir = join(rootDir, name);
  const errors: string[] = [];

  // Check components.json
  const componentsJsonPath = join(registryDir, "components.json");
  if (!existsSync(componentsJsonPath)) {
    errors.push("Missing components.json");
  }

  // Parse and validate registry.json
  const registryJsonPath = join(registryDir, "registry.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(registryJsonPath, "utf-8"));
  } catch (e) {
    errors.push(
      `Invalid JSON in registry.json: ${e instanceof Error ? e.message : e}`
    );
    return { errors, parsed: null };
  }

  const result = registrySchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`Schema: ${issue.path.join(".")} — ${issue.message}`);
    }
    return { errors, parsed: null };
  }

  const parsed: ParsedRegistry = {
    name,
    itemNames: new Set(),
    dependencies: [],
  };

  for (const item of result.data.items) {
    parsed.itemNames.add(item.name);

    for (const dependency of item.registryDependencies ?? []) {
      if (INTERNAL_DEPENDENCY_URL.test(dependency)) {
        parsed.dependencies.push({ from: item.name, url: dependency });
      }
    }

    // Verify referenced files exist on disk
    for (const file of item.files ?? []) {
      const filePath = join(registryDir, file.path);
      if (!existsSync(filePath)) {
        errors.push(`Item "${item.name}": file not found — ${file.path}`);
      }
    }
  }

  return { errors, parsed };
}

/**
 * Every registryDependency pointing at another registry of this repo must
 * resolve to an item that actually exists.
 */
function validateCrossReferences(
  registries: Map<string, ParsedRegistry>
): ValidationError[] {
  const allErrors: ValidationError[] = [];

  for (const registry of registries.values()) {
    const errors: string[] = [];
    for (const { from, url } of registry.dependencies) {
      const match = INTERNAL_DEPENDENCY_URL.exec(url);
      if (!match) {
        continue;
      }
      const [, targetRegistry, targetItem] = match;
      const target = targetRegistry ? registries.get(targetRegistry) : null;
      if (!target) {
        errors.push(
          `Item "${from}" depends on unknown registry "${targetRegistry}" (${url})`
        );
      } else if (!(targetItem && target.itemNames.has(targetItem))) {
        errors.push(
          `Item "${from}" depends on "${targetRegistry}/${targetItem}" which does not exist`
        );
      }
    }
    if (errors.length > 0) {
      allErrors.push({ registry: registry.name, errors });
    }
  }

  return allErrors;
}

export function validate(): { ok: boolean; errors: ValidationError[] } {
  const registries = findRegistries();

  if (registries.length === 0) {
    console.log("No registries found.");
    return { ok: true, errors: [] };
  }

  console.log(
    `Validating ${registries.length} registr${registries.length === 1 ? "y" : "ies"}: ${registries.join(", ")}`
  );

  const allErrors: ValidationError[] = [];
  const parsedRegistries = new Map<string, ParsedRegistry>();

  for (const name of registries) {
    const { errors, parsed } = validateRegistry(name);
    if (name === "kit") {
      errors.push(...checkKit());
    }
    if (errors.length > 0) {
      allErrors.push({ registry: name, errors });
    } else {
      console.log(`  ✓ ${name}`);
    }
    if (parsed) {
      parsedRegistries.set(name, parsed);
    }
  }

  allErrors.push(...validateCrossReferences(parsedRegistries));

  if (allErrors.length > 0) {
    console.error("\nValidation failed:\n");
    for (const { registry, errors } of allErrors) {
      console.error(`  ✗ ${registry}`);
      for (const err of errors) {
        console.error(`    - ${err}`);
      }
    }
    return { ok: false, errors: allErrors };
  }

  console.log("\nAll registries passed validation.");
  return { ok: true, errors: [] };
}

// Run standalone
if (process.argv[1]?.endsWith("validate.mts")) {
  const { ok } = validate();
  if (!ok) {
    process.exit(1);
  }
}
