import { describe, expect, it } from "vitest";

import { resolvePageSize } from "../page-size";

describe("resolvePageSize", () => {
	it("defaults to A4 portrait", () => {
		expect(resolvePageSize({})).toEqual({ width: 595.28, height: 841.89 });
	});

	it("flips named sizes in landscape", () => {
		expect(resolvePageSize({ size: "a4", orientation: "landscape" })).toEqual({
			width: 841.89,
			height: 595.28,
		});
	});

	it("reads arrays, objects and units", () => {
		expect(resolvePageSize({ size: [300, 400] })).toEqual({
			width: 300,
			height: 400,
		});
		expect(resolvePageSize({ size: { width: "1in", height: "2in" } })).toEqual({
			width: 72,
			height: 144,
		});
	});

	it("has no height for auto-height pages", () => {
		expect(resolvePageSize({ size: { width: 420 } }).height).toBeUndefined();
	});
});
