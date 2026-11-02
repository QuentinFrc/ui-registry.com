import { describe, expect, it } from "vitest";

import { pdfSafe } from "../format";

describe("pdfSafe", () => {
	it("replaces characters the built-in fonts lack", () => {
		const money = pdfSafe(
			new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }),
		);
		const text = money.format(-1234.5);
		expect(text).not.toContain(String.fromCharCode(0x20_2f));
		expect(text).not.toContain(String.fromCharCode(0x22_12));
		expect(text.startsWith("-")).toBe(true);
	});
});
