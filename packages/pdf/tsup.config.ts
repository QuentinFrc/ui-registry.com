import { defineConfig } from "tsup";

export default defineConfig({
	clean: true,
	dts: true,
	entry: ["src/index.ts", "src/tw-entry.ts", "src/font-entry.ts"],
	external: ["react", "@react-pdf/renderer"],
	format: ["esm", "cjs"],
	splitting: false,
});
