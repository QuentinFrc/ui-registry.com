import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { registrySchema } from "shadcn/schema";

const rootDir = resolve(import.meta.dirname);

interface ValidationError {
  errors: string[];
  registry: string;
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

function validateRegistry(name: string): ValidationError | null {
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
    return { registry: name, errors };
  }

  const result = registrySchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`Schema: ${issue.path.join(".")} — ${issue.message}`);
    }
    return errors.length > 0 ? { registry: name, errors } : null;
  }

  // Verify referenced files exist on disk
  for (const item of result.data.items) {
    if (!item.files) {
      continue;
    }
    for (const file of item.files) {
      const filePath = join(registryDir, file.path);
      if (!existsSync(filePath)) {
        errors.push(`Item "${item.name}": file not found — ${file.path}`);
      }
    }
  }

  return errors.length > 0 ? { registry: name, errors } : null;
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

  for (const name of registries) {
    const result = validateRegistry(name);
    if (result) {
      allErrors.push(result);
    } else {
      console.log(`  ✓ ${name}`);
    }
  }

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
