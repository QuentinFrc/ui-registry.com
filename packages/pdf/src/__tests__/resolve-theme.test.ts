import { resolveTheme } from "../tw";

describe("resolveTheme()", () => {
	it("returns defaults when called without args", () => {
		const t = resolveTheme();
		expect(t.spacingBase).toBe(3);
		expect(t.spacing["4"]).toBe(12);
		expect(t.fontSize.base).toBe(12);
		expect(t.borderRadius.lg).toBe(6);
		expect(t.fontWeight.bold).toBe(700);
		expect(t.opacity["50"]).toBe(0.5);
		expect(t.lineHeight.normal).toBe(1.5);
		expect(t.letterSpacing.normal).toBe("0em");
		expect(t.colors["red-500"]).toBe("#ef4444");
		expect(t.colors.white).toBe("#ffffff");
		expect(t.colors.transparent).toBe("rgba(0,0,0,0)");
	});

	it("includes shadcn semantic tokens by default", () => {
		const t = resolveTheme();
		expect(t.colors.foreground).toBe("#0a0a0a");
		expect(t.colors.background).toBe("#ffffff");
		expect(t.colors.primary).toBe("#171717");
		expect(t.colors["muted-foreground"]).toBe("#737373");
		expect(t.colors.destructive).toBe("#ef4444");
		expect(t.colors.border).toBe("#e5e5e5");
	});

	it("adds custom color", () => {
		const t = resolveTheme({ "--color-brand": "#ff6600" });
		expect(t.colors.brand).toBe("#ff6600");
		expect(t.colors["red-500"]).toBe("#ef4444"); // defaults preserved
	});

	it("--color-*: initial resets all colors", () => {
		const t = resolveTheme({
			"--color-*": "initial",
			"--color-only": "#123",
		});
		expect(t.colors.only).toBe("#123");
		expect(t.colors["red-500"]).toBeUndefined();
		expect(t.colors.white).toBeUndefined();
	});

	it("--text-*: initial resets font sizes", () => {
		const t = resolveTheme({
			"--text-*": "initial",
			"--text-huge": 72,
		});
		expect(t.fontSize.huge).toBe(72);
		expect(t.fontSize.base).toBeUndefined();
	});

	it("--radius-*: initial resets border radii", () => {
		const t = resolveTheme({
			"--radius-*": "initial",
			"--radius-pill": 50,
		});
		expect(t.borderRadius.pill).toBe(50);
		expect(t.borderRadius.lg).toBeUndefined();
	});

	it("--spacing-*: initial resets spacing steps", () => {
		const t = resolveTheme({
			"--spacing-*": "initial",
			"--spacing-1": 8,
		});
		expect(t.spacing["1"]).toBe(8);
		expect(t.spacing["4"]).toBeUndefined();
	});

	it("--font-weight-*: initial resets font weights", () => {
		const t = resolveTheme({
			"--font-weight-*": "initial",
			"--font-weight-heavy": 950,
		});
		expect(t.fontWeight.heavy).toBe(950);
		expect(t.fontWeight.bold).toBeUndefined();
	});

	it("--leading-*: initial resets line heights", () => {
		const t = resolveTheme({
			"--leading-*": "initial",
			"--leading-custom": 2.5,
		});
		expect(t.lineHeight.custom).toBe(2.5);
		expect(t.lineHeight.normal).toBeUndefined();
	});

	it("--tracking-*: initial resets letter spacings", () => {
		const t = resolveTheme({
			"--tracking-*": "initial",
			"--tracking-custom": 1.5,
		});
		expect(t.letterSpacing.custom).toBe(1.5);
		expect(t.letterSpacing.wide).toBeUndefined();
	});

	it("--opacity-*: initial resets opacities", () => {
		const t = resolveTheme({
			"--opacity-*": "initial",
			"--opacity-33": 0.33,
		});
		expect(t.opacity["33"]).toBe(0.33);
		expect(t.opacity["50"]).toBeUndefined();
	});

	it("--*: initial resets everything", () => {
		const t = resolveTheme({ "--*": "initial" });
		expect(Object.keys(t.colors)).toHaveLength(0);
		expect(Object.keys(t.spacing)).toHaveLength(0);
		expect(Object.keys(t.fontSize)).toHaveLength(0);
		expect(Object.keys(t.borderRadius)).toHaveLength(0);
		expect(Object.keys(t.fontWeight)).toHaveLength(0);
		expect(Object.keys(t.lineHeight)).toHaveLength(0);
		expect(Object.keys(t.letterSpacing)).toHaveLength(0);
		expect(Object.keys(t.opacity)).toHaveLength(0);
	});

	it("--spacing overrides the base unit", () => {
		const t = resolveTheme({ "--spacing": 4 });
		expect(t.spacingBase).toBe(4);
	});

	it("normalizes oklch colors", () => {
		const t = resolveTheme({ "--color-test": "oklch(0.5 0.2 270)" });
		expect(t.colors.test).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("normalizes oklch colors with alpha", () => {
		const t = resolveTheme({ "--color-test": "oklch(0.5 0.2 270 / 50%)" });
		expect(t.colors.test).toMatch(/^rgba\(/);
	});

	it("passes through hex colors as-is", () => {
		const t = resolveTheme({ "--color-test": "#abcdef" });
		expect(t.colors.test).toBe("#abcdef");
	});

	it("keys work with or without -- prefix", () => {
		const t1 = resolveTheme({ "--color-a": "#111" });
		const t2 = resolveTheme({ "color-a": "#111" });
		expect(t1.colors.a).toBe("#111");
		expect(t2.colors.a).toBe("#111");
	});

	it("returns default fontFamily values", () => {
		const t = resolveTheme();
		expect(t.fontFamily.sans).toBe("Helvetica");
		expect(t.fontFamily.serif).toBe("Times-Roman");
		expect(t.fontFamily.mono).toBe("Courier");
	});

	it("--font-sans override", () => {
		const t = resolveTheme({ "--font-sans": "Inter" });
		expect(t.fontFamily.sans).toBe("Inter");
	});

	it("--font-*: initial resets fontFamily", () => {
		const t = resolveTheme({
			"--font-*": "initial",
			"--font-custom": "MyFont",
		});
		expect(t.fontFamily.sans).toBeUndefined();
		expect(t.fontFamily.custom).toBe("MyFont");
	});

	it("--font-weight-bold is not confused with --font-bold", () => {
		const t = resolveTheme({ "--font-weight-bold": 800 });
		expect(t.fontWeight.bold).toBe(800);
		expect(t.fontFamily.bold).toBeUndefined();
	});

	it("--*: initial also resets fontFamily", () => {
		const t = resolveTheme({ "--*": "initial" });
		expect(Object.keys(t.fontFamily)).toHaveLength(0);
	});
});
