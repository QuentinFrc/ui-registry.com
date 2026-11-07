import { createTw, tw } from "../tw";

describe("tw() — default theme", () => {
	// ── Empty / unknown ──
	it("returns {} for empty string", () => {
		expect(tw("")).toStrictEqual({});
	});

	it("returns {} for unknown utility", () => {
		expect(tw("does-not-exist")).toStrictEqual({});
	});

	// ── Display ──
	it("flex", () => {
		expect(tw("flex")).toStrictEqual({ display: "flex" });
	});

	it("hidden", () => {
		expect(tw("hidden")).toStrictEqual({ display: "none" });
	});

	// ── Flex direction / wrap ──
	it("flex-row", () => {
		expect(tw("flex-row")).toStrictEqual({ flexDirection: "row" });
	});

	it("flex-col", () => {
		expect(tw("flex-col")).toStrictEqual({ flexDirection: "column" });
	});

	it("flex-wrap", () => {
		expect(tw("flex-wrap")).toStrictEqual({ flexWrap: "wrap" });
	});

	// ── Flex grow/shrink ──
	it("flex-1", () => {
		expect(tw("flex-1")).toStrictEqual({ flex: 1 });
	});

	it("flex-none", () => {
		expect(tw("flex-none")).toStrictEqual({ flex: 0 });
	});

	it("grow / shrink", () => {
		expect(tw("grow")).toStrictEqual({ flexGrow: 1 });
		expect(tw("shrink-0")).toStrictEqual({ flexShrink: 0 });
	});

	// ── Align / Justify ──
	it("items-center", () => {
		expect(tw("items-center")).toStrictEqual({ alignItems: "center" });
	});

	it("justify-between", () => {
		expect(tw("justify-between")).toStrictEqual({
			justifyContent: "space-between",
		});
	});

	it("self-end", () => {
		expect(tw("self-end")).toStrictEqual({ alignSelf: "flex-end" });
	});

	// ── Gap ──
	it("gap-2 → 6pt", () => {
		expect(tw("gap-2")).toStrictEqual({ gap: 6 });
	});

	it("gap-x-4 → columnGap 12pt", () => {
		expect(tw("gap-x-4")).toStrictEqual({ columnGap: 12 });
	});

	it("gap-y-1 → rowGap 3pt", () => {
		expect(tw("gap-y-1")).toStrictEqual({ rowGap: 3 });
	});

	// ── Position ──
	it("relative / absolute", () => {
		expect(tw("relative")).toStrictEqual({ position: "relative" });
		expect(tw("absolute")).toStrictEqual({ position: "absolute" });
	});

	// ── Inset ──
	it("top-2 → 6pt", () => {
		expect(tw("top-2")).toStrictEqual({ top: 6 });
	});

	it("left-4 → 12pt", () => {
		expect(tw("left-4")).toStrictEqual({ left: 12 });
	});

	// ── Overflow ──
	it("overflow-hidden", () => {
		expect(tw("overflow-hidden")).toStrictEqual({ overflow: "hidden" });
	});

	// ── Z-index ──
	it("z-10", () => {
		expect(tw("z-10")).toStrictEqual({ zIndex: 10 });
	});

	it("z-[99]", () => {
		expect(tw("z-[99]")).toStrictEqual({ zIndex: 99 });
	});

	// ── Width ──
	it("w-full → 100%", () => {
		expect(tw("w-full")).toStrictEqual({ width: "100%" });
	});

	it("w-8 → 24pt", () => {
		expect(tw("w-8")).toStrictEqual({ width: 24 });
	});

	it("min-w-full", () => {
		expect(tw("min-w-full")).toStrictEqual({ minWidth: "100%" });
	});

	it("max-w-none", () => {
		expect(tw("max-w-none")).toStrictEqual({ maxWidth: "none" });
	});

	// ── Height ──
	it("h-full → 100%", () => {
		expect(tw("h-full")).toStrictEqual({ height: "100%" });
	});

	it("h-5 → 15pt", () => {
		expect(tw("h-5")).toStrictEqual({ height: 15 });
	});

	// ── Padding ──
	it("p-4 → 12pt all sides", () => {
		expect(tw("p-4")).toStrictEqual({
			paddingBottom: 12,
			paddingLeft: 12,
			paddingRight: 12,
			paddingTop: 12,
		});
	});

	it("px-2 → paddingHorizontal 6pt", () => {
		expect(tw("px-2")).toStrictEqual({ paddingHorizontal: 6 });
	});

	it("py-3 → paddingVertical 9pt", () => {
		expect(tw("py-3")).toStrictEqual({ paddingVertical: 9 });
	});

	it("pt-1 → paddingTop 3pt", () => {
		expect(tw("pt-1")).toStrictEqual({ paddingTop: 3 });
	});

	it("p-px → 0.75pt", () => {
		expect(tw("p-px")).toStrictEqual({
			paddingBottom: 0.75,
			paddingLeft: 0.75,
			paddingRight: 0.75,
			paddingTop: 0.75,
		});
	});

	// ── Margin ──
	it("m-2 → 6pt all sides", () => {
		expect(tw("m-2")).toStrictEqual({
			marginBottom: 6,
			marginLeft: 6,
			marginRight: 6,
			marginTop: 6,
		});
	});

	it("mx-4 → marginHorizontal 12pt", () => {
		expect(tw("mx-4")).toStrictEqual({ marginHorizontal: 12 });
	});

	it("mb-1 → marginBottom 3pt", () => {
		expect(tw("mb-1")).toStrictEqual({ marginBottom: 3 });
	});

	it("negative margin: mt--2 doesn't work (needs -mt-2 syntax check)", () => {
		// tw doesn't support -mt-2 style negatives at the class level,
		// but the spacingProp handles raw negative values like m--2
		// Let's test arbitrary value instead
		expect(tw("mt-[10]")).toStrictEqual({ marginTop: 10 });
	});

	// ── Font size ──
	it("text-sm → 10.5pt", () => {
		expect(tw("text-sm")).toStrictEqual({ fontSize: 10.5 });
	});

	it("text-2xl → 18pt", () => {
		expect(tw("text-2xl")).toStrictEqual({ fontSize: 18 });
	});

	it("text-[14] → arbitrary", () => {
		expect(tw("text-[14]")).toStrictEqual({ fontSize: 14 });
	});

	// ── Text color ──
	it("text-red-500 → #ef4444", () => {
		expect(tw("text-red-500")).toStrictEqual({ color: "#ef4444" });
	});

	it("text-white → #ffffff", () => {
		expect(tw("text-white")).toStrictEqual({ color: "#ffffff" });
	});

	it("text-foreground → shadcn default #0a0a0a", () => {
		expect(tw("text-foreground")).toStrictEqual({ color: "#0a0a0a" });
	});

	it("text-muted-foreground → #737373", () => {
		expect(tw("text-muted-foreground")).toStrictEqual({ color: "#737373" });
	});

	// ── Background color ──
	it("bg-blue-500 → #3b82f6", () => {
		expect(tw("bg-blue-500")).toStrictEqual({ backgroundColor: "#3b82f6" });
	});

	it("bg-white → #ffffff", () => {
		expect(tw("bg-white")).toStrictEqual({ backgroundColor: "#ffffff" });
	});

	it("bg-transparent → rgba(0,0,0,0)", () => {
		expect(tw("bg-transparent")).toStrictEqual({
			backgroundColor: "rgba(0,0,0,0)",
		});
	});

	// ── Color with alpha ──
	it("bg-red-500/50 → rgba with 50% alpha", () => {
		const result = tw("bg-red-500/50");
		expect(result.backgroundColor).toMatch(/^rgba\(239, 68, 68, 0\.5\)$/);
	});

	it("text-black/25 → rgba", () => {
		const result = tw("text-black/25");
		expect(result.color).toMatch(/^rgba\(0, 0, 0, 0\.25\)$/);
	});

	// ── Arbitrary color ──
	it("bg-[#ff0000]", () => {
		expect(tw("bg-[#ff0000]")).toStrictEqual({ backgroundColor: "#ff0000" });
	});

	// ── Font weight ──
	it("font-bold → 700", () => {
		expect(tw("font-bold")).toStrictEqual({ fontWeight: 700 });
	});

	it("font-medium → 500", () => {
		expect(tw("font-medium")).toStrictEqual({ fontWeight: 500 });
	});

	// ── Font style ──
	it("italic", () => {
		expect(tw("italic")).toStrictEqual({ fontStyle: "italic" });
	});

	it("not-italic", () => {
		expect(tw("not-italic")).toStrictEqual({ fontStyle: "normal" });
	});

	// ── Text align ──
	it("text-center", () => {
		expect(tw("text-center")).toStrictEqual({ textAlign: "center" });
	});

	it("text-right", () => {
		expect(tw("text-right")).toStrictEqual({ textAlign: "right" });
	});

	// ── Text decoration ──
	it("underline", () => {
		expect(tw("underline")).toStrictEqual({ textDecoration: "underline" });
	});

	it("line-through", () => {
		expect(tw("line-through")).toStrictEqual({
			textDecoration: "line-through",
		});
	});

	// ── Text transform ──
	it("uppercase", () => {
		expect(tw("uppercase")).toStrictEqual({ textTransform: "uppercase" });
	});

	it("capitalize", () => {
		expect(tw("capitalize")).toStrictEqual({ textTransform: "capitalize" });
	});

	// ── Line height ──
	it("leading-tight → 1.25", () => {
		expect(tw("leading-tight")).toStrictEqual({ lineHeight: 1.25 });
	});

	it("leading-relaxed → 1.625", () => {
		expect(tw("leading-relaxed")).toStrictEqual({ lineHeight: 1.625 });
	});

	it("leading-2 → absolute (spacing scale, like Tailwind v4)", () => {
		expect(tw("leading-2")).toStrictEqual({ lineHeight: "6pt" });
	});

	// ── Letter spacing ──
	it("tracking-wide → 0.025em", () => {
		expect(tw("tracking-wide")).toStrictEqual({ letterSpacing: "0.025em" });
	});

	it("tracking-tighter → -0.05em", () => {
		expect(tw("tracking-tighter")).toStrictEqual({ letterSpacing: "-0.05em" });
	});

	// ── Max lines ──
	it("line-clamp-3", () => {
		expect(tw("line-clamp-3")).toStrictEqual({ maxLines: 3 });
	});

	// ── Border width ──
	it("border → 1", () => {
		expect(tw("border")).toStrictEqual({ borderWidth: 1 });
	});

	it("border-0 → 0", () => {
		expect(tw("border-0")).toStrictEqual({ borderWidth: 0 });
	});

	it("border-2 → 2", () => {
		expect(tw("border-2")).toStrictEqual({ borderWidth: 2 });
	});

	it("border-t → borderTopWidth: 1", () => {
		expect(tw("border-t")).toStrictEqual({ borderTopWidth: 1 });
	});

	// ── Border color ──
	it("border-red-500 → #ef4444", () => {
		expect(tw("border-red-500")).toStrictEqual({ borderColor: "#ef4444" });
	});

	it("border-border → shadcn default #e5e5e5", () => {
		expect(tw("border-border")).toStrictEqual({ borderColor: "#e5e5e5" });
	});

	// ── Border style ──
	it("border-dashed", () => {
		expect(tw("border-dashed")).toStrictEqual({ borderStyle: "dashed" });
	});

	// ── Border radius ──
	it("rounded → DEFAULT 3pt", () => {
		expect(tw("rounded")).toStrictEqual({ borderRadius: 3 });
	});

	it("rounded-lg → 6pt", () => {
		expect(tw("rounded-lg")).toStrictEqual({ borderRadius: 6 });
	});

	it("rounded-full → 999", () => {
		expect(tw("rounded-full")).toStrictEqual({ borderRadius: 999 });
	});

	it("rounded-none → 0", () => {
		expect(tw("rounded-none")).toStrictEqual({ borderRadius: 0 });
	});

	it("rounded-t-lg → top corners", () => {
		expect(tw("rounded-t-lg")).toStrictEqual({
			borderTopLeftRadius: 6,
			borderTopRightRadius: 6,
		});
	});

	it("rounded-tl-md → single corner", () => {
		expect(tw("rounded-tl-md")).toStrictEqual({
			borderTopLeftRadius: 4.5,
		});
	});

	// ── Opacity ──
	it("opacity-50 → 0.5", () => {
		expect(tw("opacity-50")).toStrictEqual({ opacity: 0.5 });
	});

	it("opacity-0 → 0", () => {
		expect(tw("opacity-0")).toStrictEqual({ opacity: 0 });
	});

	// ── Object fit ──
	it("object-cover", () => {
		expect(tw("object-cover")).toStrictEqual({ objectFit: "cover" });
	});

	it("object-center", () => {
		expect(tw("object-center")).toStrictEqual({ objectPosition: "center" });
	});

	// ── Multiple classes ──
	it("combines multiple classes", () => {
		const result = tw("flex flex-row items-center gap-2 p-4");
		expect(result).toStrictEqual({
			alignItems: "center",
			display: "flex",
			flexDirection: "row",
			gap: 6,
			paddingBottom: 12,
			paddingLeft: 12,
			paddingRight: 12,
			paddingTop: 12,
		});
	});

	it("later class overrides earlier", () => {
		const result = tw("p-2 p-4");
		expect(result.paddingTop).toBe(12);
	});

	it("text-sm + text-red-500 → both fontSize and color", () => {
		const result = tw("text-red-500 text-sm");
		expect(result.fontSize).toBe(10.5);
		expect(result.color).toBe("#ef4444");
	});

	// ── Caching ──
	it("returns same reference for same input (cached)", () => {
		const a = tw("flex p-4");
		const b = tw("flex p-4");
		expect(a).toBe(b);
	});

	// ── Arbitrary spacing ──
	it("w-[100] → arbitrary width", () => {
		expect(tw("w-[100]")).toStrictEqual({ width: 100 });
	});

	it("h-[50] → arbitrary height", () => {
		expect(tw("h-[50]")).toStrictEqual({ height: 50 });
	});

	it("gap-[8] → arbitrary gap", () => {
		expect(tw("gap-[8]")).toStrictEqual({ gap: 8 });
	});
});

describe("createTw() — custom theme", () => {
	it("custom color via --color-brand", () => {
		const custom = createTw({ "--color-brand": "#ff6600" });
		expect(custom("text-brand")).toStrictEqual({ color: "#ff6600" });
		expect(custom("bg-brand")).toStrictEqual({ backgroundColor: "#ff6600" });
	});

	it("--color-*: initial resets all default colors", () => {
		const custom = createTw({
			"--color-*": "initial",
			"--color-brand": "#ff6600",
		});
		expect(custom("text-brand")).toStrictEqual({ color: "#ff6600" });
		expect(custom("text-red-500")).toStrictEqual({}); // red-500 was reset
	});

	it("custom font size via --text-tiny", () => {
		const custom = createTw({ "--text-tiny": 5 });
		expect(custom("text-tiny")).toStrictEqual({ fontSize: 5 });
	});

	it("custom radius via --radius-pill", () => {
		const custom = createTw({ "--radius-pill": 50 });
		expect(custom("rounded-pill")).toStrictEqual({ borderRadius: 50 });
	});

	it("custom spacing via --spacing-18", () => {
		const custom = createTw({ "--spacing-18": 72 });
		expect(custom("p-18")).toStrictEqual({
			paddingBottom: 72,
			paddingLeft: 72,
			paddingRight: 72,
			paddingTop: 72,
		});
	});

	it("custom font weight via --font-weight-black", () => {
		const custom = createTw({ "--font-weight-black": 950 });
		expect(custom("font-black")).toStrictEqual({ fontWeight: 950 });
	});

	it("custom line height via --leading-extra", () => {
		const custom = createTw({ "--leading-extra": 3 });
		expect(custom("leading-extra")).toStrictEqual({ lineHeight: 3 });
	});

	it("svg fill and stroke", () => {
		expect(tw("fill-primary")).toStrictEqual({ fill: "#171717" });
		expect(tw("fill-none")).toStrictEqual({ fill: "none" });
		expect(tw("stroke-border")).toStrictEqual({ stroke: "#e5e5e5" });
		expect(tw("stroke-2")).toStrictEqual({ strokeWidth: 2 });
		expect(tw("stroke-[1.5]")).toStrictEqual({ strokeWidth: 1.5 });
	});

	it("chart colors", () => {
		expect(tw("bg-chart-1")).toStrictEqual({ backgroundColor: "#f54a00" });
	});

	it("arbitrary tracking values", () => {
		expect(tw("tracking-[0.2em]")).toStrictEqual({ letterSpacing: "0.2em" });
		expect(tw("tracking-[2px]")).toStrictEqual({ letterSpacing: 1.5 });
		expect(tw("tracking-[1.5]")).toStrictEqual({ letterSpacing: 1.5 });
	});

	it("custom letter spacing via --tracking-extra", () => {
		const custom = createTw({ "--tracking-extra": 2 });
		expect(custom("tracking-extra")).toStrictEqual({ letterSpacing: 2 });
	});

	it("oklch color is converted to hex", () => {
		const custom = createTw({ "--color-test": "oklch(0.5 0.2 270)" });
		const result = custom("text-test");
		expect(result.color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("oklch color with alpha is converted to rgba", () => {
		const custom = createTw({ "--color-test": "oklch(0.5 0.2 270 / 0.5)" });
		const result = custom("text-test");
		expect(result.color).toMatch(/^rgba\(/);
	});

	it("preserves defaults when adding custom values", () => {
		const custom = createTw({ "--color-brand": "#ff6600" });
		// Default colors should still work
		expect(custom("text-red-500")).toStrictEqual({ color: "#ef4444" });
		expect(custom("bg-white")).toStrictEqual({ backgroundColor: "#ffffff" });
	});

	it("wildcard --*: initial resets everything", () => {
		const custom = createTw({
			"--*": "initial",
			"--color-only": "#123456",
		});
		expect(custom("text-only")).toStrictEqual({ color: "#123456" });
		expect(custom("text-red-500")).toStrictEqual({});
		expect(custom("font-bold")).toStrictEqual({});
		expect(custom("p-4")).toStrictEqual({});
	});
});
