import type { StandardSchemaV1 } from "./standard-schema.js";
import type {
  CatalogEntry,
  FlashCatalog,
  FlashLevel,
  ToastFlash,
} from "./types.js";

/**
 * Declares a message catalog. Each `render` receives the params validated by
 * its sibling `params` schema.
 *
 * @example
 * const messages = defineCatalog({
 *   "order.placed": {
 *     level: "success",
 *     params: z.object({ orderId: z.string().uuid() }),
 *     render: (p) => `Order ${p.orderId.slice(0, 8)} placed`,
 *   },
 *   "auth.signed-out": { level: "info", render: () => "Signed out" },
 * });
 */
export function defineCatalog<const P extends Record<string, unknown>>(
  catalog: {
    [K in keyof P]: CatalogEntry<P[K]>;
  }
): { [K in keyof P]: CatalogEntry<P[K]> } {
  warnUnconstrainedParams(catalog);
  return catalog;
}

const LEVELS: ReadonlySet<string> = new Set<FlashLevel>([
  "info",
  "success",
  "warning",
  "error",
]);

function fail(message: string): StandardSchemaV1.FailureResult {
  return { issues: [{ message }] };
}

/** A dependency-free Standard Schema for {@link ToastFlash}. */
export const toastSchema: StandardSchemaV1<unknown, ToastFlash> = {
  "~standard": {
    version: 1,
    vendor: "@ui-registry/flash",
    validate(value) {
      if (typeof value !== "object" || value === null) {
        return fail("Expected an object");
      }
      const { message, level } = value as Record<string, unknown>;
      if (typeof message !== "string") {
        return fail("`message` must be a string");
      }
      if (
        level !== undefined &&
        !(typeof level === "string" && LEVELS.has(level))
      ) {
        return fail("`level` must be info, success, warning or error");
      }
      return {
        value:
          level === undefined
            ? { message }
            : { message, level: level as FlashLevel },
      };
    },
  },
};

// Typed locally so bundlers can still inline `process.env.NODE_ENV`.
declare const process: { env: Record<string, string | undefined> } | undefined;

export function isDev(): boolean {
  return (
    typeof process !== "undefined" && process.env.NODE_ENV !== "production"
  );
}

interface JsonSchemaLike {
  const?: unknown;
  enum?: unknown;
  format?: unknown;
  maxLength?: unknown;
  pattern?: unknown;
  properties?: Record<string, JsonSchemaLike>;
  type?: unknown;
}

interface WithJsonSchema {
  "~standard": {
    jsonSchema?: { input?: (options: { target: string }) => unknown };
  };
}

function isFreeString(schema: JsonSchemaLike): boolean {
  const constrained =
    schema.format !== undefined ||
    schema.pattern !== undefined ||
    schema.maxLength !== undefined ||
    schema.enum !== undefined ||
    schema.const !== undefined;
  return schema.type === "string" && !constrained;
}

function freeStringParams(schema: StandardSchemaV1): string[] {
  const toJsonSchema = (schema as unknown as WithJsonSchema)["~standard"]
    .jsonSchema?.input;
  if (!toJsonSchema) {
    return [];
  }
  try {
    const json = toJsonSchema({ target: "draft-2020-12" }) as JsonSchemaLike;
    return Object.entries(json.properties ?? {})
      .filter(([, property]) => isFreeString(property))
      .map(([name]) => name);
  } catch {
    return [];
  }
}

/**
 * Params stay user-controlled: a free `string` interpolated into the text
 * brings injection back. Warn in dev when the schema exposes enough metadata
 * (Standard JSON Schema) to tell.
 */
function warnUnconstrainedParams(catalog: FlashCatalog): void {
  if (!isDev()) {
    return;
  }
  for (const [code, entry] of Object.entries(catalog)) {
    if (!entry.params) {
      continue;
    }
    for (const name of freeStringParams(entry.params)) {
      console.warn(
        `[@ui-registry/flash] "${code}" has an unconstrained string param "${name}". Anyone can put any text in it: prefer a format, an enum or a max length.`
      );
    }
  }
}
