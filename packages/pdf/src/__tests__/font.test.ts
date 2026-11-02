vi.mock(
	import("@react-pdf/renderer"),
	() =>
		({
			Font: { register: vi.fn() },
		}) as any,
);

import { Font } from "@react-pdf/renderer";

import { defineFont } from "../font";

const mockRegister = Font.register as ReturnType<typeof vi.fn>;

beforeEach(() => {
	mockRegister.mockClear();
});

describe("defineFont()", () => {
	it("registers a single-source font", () => {
		const result = defineFont({
			family: "Inter",
			src: "/fonts/Inter-Regular.ttf",
		});

		expect(mockRegister).toHaveBeenCalledOnce();
		expect(mockRegister).toHaveBeenCalledWith({
			family: "Inter",
			src: "/fonts/Inter-Regular.ttf",
		});
		expect(result.family).toBe("Inter");
		expect(result.className).toBe("font-[Inter]");
		expect(result.style).toStrictEqual({ fontFamily: "Inter" });
	});

	it("registers a multi-variant font family", () => {
		const result = defineFont({
			family: "Inter",
			src: [
				{ src: "/fonts/Inter-Regular.ttf", weight: 400 },
				{ src: "/fonts/Inter-Bold.ttf", weight: 700 },
				{ src: "/fonts/Inter-Italic.ttf", style: "italic", weight: 400 },
			],
		});

		expect(mockRegister).toHaveBeenCalledOnce();
		expect(mockRegister).toHaveBeenCalledWith({
			family: "Inter",
			fonts: [
				{
					fontStyle: undefined,
					fontWeight: 400,
					src: "/fonts/Inter-Regular.ttf",
				},
				{ fontStyle: undefined, fontWeight: 700, src: "/fonts/Inter-Bold.ttf" },
				{
					fontStyle: "italic",
					fontWeight: 400,
					src: "/fonts/Inter-Italic.ttf",
				},
			],
		});
		expect(result.family).toBe("Inter");
		expect(result.className).toBe("font-[Inter]");
		expect(result.style).toStrictEqual({ fontFamily: "Inter" });
	});

	it("passes through remote fetch options", () => {
		defineFont({
			family: "Custom",
			src: [
				{
					headers: { Authorization: "Bearer token" },
					src: "https://example.com/font.woff2",
					weight: 400,
				},
			],
		});

		expect(mockRegister).toHaveBeenCalledWith({
			family: "Custom",
			fonts: [
				{
					fontStyle: undefined,
					fontWeight: 400,
					headers: { Authorization: "Bearer token" },
					src: "https://example.com/font.woff2",
				},
			],
		});
	});

	it("className works with tw engine", async () => {
		const { tw } = await import("../tw");
		const font = defineFont({ family: "MyFont", src: "/fonts/MyFont.ttf" });
		const styles = tw(font.className);
		expect(styles).toStrictEqual({ fontFamily: "MyFont" });
	});
});
