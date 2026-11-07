import "server-only";

import { resolve } from "node:path";
import ts from "typescript";

// Props tables for the PDF docs, extracted from the package source with the
// TypeScript compiler at build time (pages are statically rendered).

const pdfSrc = resolve(process.cwd(), "../../packages/pdf/src");
const ENTRY_FILES = ["primitives.tsx", "svg.tsx"].map((file) =>
  resolve(pdfSrc, file)
);

export interface PropDoc {
  defaultValue?: string;
  description: string;
  name: string;
  optional: boolean;
  /** Declared by @ui-registries/pdf itself (vs inherited from react-pdf). */
  own: boolean;
  type: string;
}

const TYPE_FORMAT =
  // biome-ignore lint/suspicious/noBitwiseOperators: compiler flags
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

let program: ts.Program | undefined;

const getProgram = () => {
  program ??= ts.createProgram(ENTRY_FILES, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  });
  return program;
};

// Keep props from the package and from react-pdf; skip React's DOM typings.
const isDocumented = (fileName: string) =>
  fileName.includes("/packages/pdf/src/") || fileName.includes("@react-pdf/");

const findExport = (checker: ts.TypeChecker, name: string) => {
  for (const file of ENTRY_FILES) {
    const source = getProgram().getSourceFile(file);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
      continue;
    }
    const symbol = checker
      .getExportsOfModule(moduleSymbol)
      .find((candidate) => candidate.name === name);
    if (symbol) {
      return symbol;
    }
  }
  return;
};

const cache = new Map<string, PropDoc[]>();

export function getPropDocs(name: string): PropDoc[] {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }

  const checker = getProgram().getTypeChecker();
  const symbol = findExport(checker, name);
  if (!symbol) {
    throw new Error(`PropsTable: no export named "${name}" in ${pdfSrc}`);
  }
  const type = checker.getDeclaredTypeOfSymbol(symbol);

  const props: PropDoc[] = [];
  for (const property of checker.getPropertiesOfType(type)) {
    const declaration = property.declarations?.[0];
    const fileName = declaration?.getSourceFile().fileName ?? "";
    if (!(declaration && isDocumented(fileName))) {
      continue;
    }
    const propertyType = checker.getTypeOfSymbolAtLocation(
      property,
      declaration
    );
    // TypeScript symbol and format flags are bit masks.
    // biome-ignore lint/suspicious/noBitwiseOperators: compiler flags
    const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
    const defaultTag = property
      .getJsDocTags(checker)
      .find((tag) => tag.name === "default" || tag.name === "defaultValue");
    props.push({
      name: property.name,
      optional,
      own: fileName.includes("/packages/pdf/src/"),
      type: checker
        .typeToString(propertyType, declaration, TYPE_FORMAT)
        .replace(" | undefined", ""),
      description: ts.displayPartsToString(
        property.getDocumentationComment(checker)
      ),
      defaultValue: defaultTag?.text
        ? ts.displayPartsToString(defaultTag.text)
        : undefined,
    });
  }

  // Package props first, then inherited ones; alphabetical within each group.
  props.sort(
    (a, b) => Number(b.own) - Number(a.own) || a.name.localeCompare(b.name)
  );
  cache.set(name, props);
  return props;
}
