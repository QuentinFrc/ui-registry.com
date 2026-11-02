import { describe, expect, it } from "vitest";

import { DEFAULT_FONT_SIZE, resolveTypography } from "../styles";

const root = { fontSize: DEFAULT_FONT_SIZE };

describe("resolveTypography", () => {
	it("leaves elements without font size or line height untouched", () => {
		const style = [{ color: "red" }];
		const result = resolveTypography(root, style);
		expect(result.style).toBe(style);
		expect(result.typography).toBe(root);
	});

	it("pins a multiplier to the element's own font size", () => {
		const result = resolveTypography(root, [
			{ fontSize: 10.5 },
			{ lineHeight: 1.625 },
		]);
		expect(result.style.at(-1)).toEqual({ lineHeight: "17.06pt" });
		expect(result.typography).toEqual({ fontSize: 10.5, leading: 1.625 });
	});

	it("uses the inherited font size, not react-pdf's default 18", () => {
		const page = resolveTypography(root, { fontSize: 10.5 }).typography;
		const text = resolveTypography(page, { lineHeight: 1.625 });
		expect(text.style.at(-1)).toEqual({ lineHeight: "17.06pt" });
	});

	it("re-applies an inherited multiplier when the font size changes", () => {
		const page = resolveTypography(root, {
			fontSize: 10.5,
			lineHeight: 1.5,
		}).typography;
		const heading = resolveTypography(page, { fontSize: 24 });
		expect(heading.style.at(-1)).toEqual({ lineHeight: "36pt" });
		expect(heading.typography).toEqual({ fontSize: 24, leading: 1.5 });
	});

	it("keeps absolute line heights and stops inheriting the multiplier", () => {
		const page = resolveTypography(root, {
			fontSize: 10.5,
			lineHeight: 1.5,
		}).typography;
		const text = resolveTypography(page, { fontSize: 12, lineHeight: "18pt" });
		expect(text.style).toEqual({ fontSize: 12, lineHeight: "18pt" });
		expect(text.typography).toEqual({ fontSize: 12, leading: undefined });
	});

	it("reads percentages and px font sizes", () => {
		const result = resolveTypography(root, {
			fontSize: "16px",
			lineHeight: "150%",
		});
		expect(result.style.at(-1)).toEqual({ lineHeight: "18pt" });
	});

	it("turns em letter spacing into points against the font size", () => {
		const page = resolveTypography(root, { fontSize: 10.5 }).typography;
		const label = resolveTypography(page, { letterSpacing: "0.1em" });
		expect(label.style.at(-1)).toEqual({ letterSpacing: "1.05pt" });
		const heading = resolveTypography(page, {
			fontSize: 24,
			letterSpacing: "-0.025em",
		});
		expect(heading.style.at(-1)).toEqual({ letterSpacing: "-0.6pt" });
	});
});
