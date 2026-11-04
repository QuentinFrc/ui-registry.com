describe("dev warnings for unknown classes", () => {
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
		vi.restoreAllMocks();
	});

	it("warns once for unknown class in non-production", async () => {
		process.env.NODE_ENV = "development";
		// Fresh import to get a fresh warned set
		const { createTw } = await import("../tw");
		const tw = createTw();
		tw("totally-unknown-class-xyz");
		expect(console.warn).toHaveBeenCalledWith(
			'[@ui-registries/pdf] Unknown utility class: "totally-unknown-class-xyz"',
		);
	});

	it("warns only once per class", async () => {
		process.env.NODE_ENV = "development";
		const { createTw } = await import("../tw");
		const tw = createTw();
		tw("another-unknown-abc");
		tw("another-unknown-abc");
		const calls = (console.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
			(c) => typeof c[0] === "string" && c[0].includes("another-unknown-abc"),
		);
		expect(calls).toHaveLength(1);
	});

	it("does not warn in production", async () => {
		process.env.NODE_ENV = "production";
		const { createTw } = await import("../tw");
		const tw = createTw();
		tw("prod-unknown-class-xyz");
		const calls = (console.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
			(c) =>
				typeof c[0] === "string" && c[0].includes("prod-unknown-class-xyz"),
		);
		expect(calls).toHaveLength(0);
	});
});
