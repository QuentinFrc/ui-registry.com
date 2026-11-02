import { cn } from "../cn";

describe("cn()", () => {
	it('cn("a", "b") → "a b"', () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it('cn("a", false, "b") → "a b"', () => {
		expect(cn("a", false, "b")).toBe("a b");
	});

	it('cn("a", undefined, null, "", "b") → "a b"', () => {
		expect(cn("a", undefined, null, "", "b")).toBe("a b");
	});

	it('cn() → ""', () => {
		expect(cn()).toBe("");
	});

	it('cn(false, null, undefined) → ""', () => {
		expect(cn(false, null)).toBe("");
	});

	it("single class", () => {
		expect(cn("flex")).toBe("flex");
	});
});
