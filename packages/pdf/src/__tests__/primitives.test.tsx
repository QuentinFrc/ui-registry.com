import { cleanup, render } from "@testing-library/react";
import React from "react";

afterEach(cleanup);

// Mock @react-pdf/renderer — its components don't render in jsdom
vi.mock(import("@react-pdf/renderer"), () => {
	const make = (name: string) =>
		React.forwardRef((allProps: any, ref: any) => {
			const { style, wrap, render, ...rest } = allProps;
			return React.createElement("div", {
				ref,
				"data-has-wrap": "wrap" in allProps ? "true" : undefined,
				"data-testid": name,
				"data-style": style ? JSON.stringify(style) : undefined,
				"data-wrap": wrap !== undefined ? String(wrap) : undefined,
				"data-render": render
					? JSON.stringify(
							render({
								pageNumber: 3,
								totalPages: 10,
								subPageNumber: 1,
								subPageTotalPages: 1,
							}),
						)
					: undefined,
				...rest,
			});
		});

	return {
		Canvas: make("rp-canvas"),
		Circle: make("rp-circle"),
		ClipPath: make("rp-clippath"),
		Defs: make("rp-defs"),
		Document: make("rp-document"),
		Ellipse: make("rp-ellipse"),
		G: make("rp-g"),
		Image: make("rp-image"),
		Line: make("rp-line"),
		LinearGradient: make("rp-lineargradient"),
		Link: make("rp-link"),
		Note: make("rp-note"),
		Page: make("rp-page"),
		Path: make("rp-path"),
		Polygon: make("rp-polygon"),
		Polyline: make("rp-polyline"),
		RadialGradient: make("rp-radialgradient"),
		Rect: make("rp-rect"),
		Stop: make("rp-stop"),
		Svg: make("rp-svg"),
		Text: make("rp-text"),
		Tspan: make("rp-tspan"),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		View: make("rp-view"),
	} as any;
});

import {
	Block,
	Canvas,
	Document,
	G,
	Link,
	Note,
	Page,
	PageNumber,
	Svg,
	SvgText,
	Tailwind,
	Text,
	View,
} from "../index";

function getStyle(el: HTMLElement): any {
	const raw = el.dataset.style;
	return raw ? JSON.parse(raw) : undefined;
}

describe(Block, () => {
	it("renders with className converted to style", () => {
		const { getByTestId } = render(<Block className="bg-white p-4" />);
		const el = getByTestId("rp-view");
		const style = getStyle(el);
		expect(style).toStrictEqual([
			{
				backgroundColor: "#ffffff",
				paddingBottom: 12,
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 12,
			},
		]);
	});

	it("renders with inline style only", () => {
		const { getByTestId } = render(<Block style={{ width: 100 }} />);
		const style = getStyle(getByTestId("rp-view"));
		expect(style).toStrictEqual([{ width: 100 }]);
	});

	it("merges className and inline style (tw first, then inline)", () => {
		const { getByTestId } = render(
			<Block className="p-2" style={{ color: "red" }} />,
		);
		const style = getStyle(getByTestId("rp-view"));
		expect(style).toStrictEqual([
			{ paddingBottom: 6, paddingLeft: 6, paddingRight: 6, paddingTop: 6 },
			{ color: "red" },
		]);
	});

	it("inline style overrides className when merged (array order)", () => {
		const { getByTestId } = render(
			<Block className="bg-white" style={{ backgroundColor: "red" }} />,
		);
		const style = getStyle(getByTestId("rp-view"));
		// tw styles come first, inline second — react-pdf uses last-wins
		expect(style[0]).toStrictEqual({ backgroundColor: "#ffffff" });
		expect(style[1]).toStrictEqual({ backgroundColor: "red" });
	});

	it("supports style as array", () => {
		const { getByTestId } = render(
			<Block style={[{ width: 10 }, { height: 20 }]} />,
		);
		const style = getStyle(getByTestId("rp-view"));
		expect(style).toStrictEqual([{ width: 10 }, { height: 20 }]);
	});

	it("passes no style when neither className nor style provided", () => {
		const { getByTestId } = render(<Block />);
		expect(getByTestId("rp-view").dataset.style).toBeUndefined();
	});

	it("breakable={false} maps to wrap=false", () => {
		const { getByTestId } = render(<Block breakable={false} />);
		expect(getByTestId("rp-view").dataset.wrap).toBe("false");
	});

	it("breakable={true} maps to wrap=true", () => {
		const { getByTestId } = render(<Block breakable={true} />);
		expect(getByTestId("rp-view").dataset.wrap).toBe("true");
	});

	it("does not pass a wrap prop when breakable is not set", () => {
		// react-pdf checks `"wrap" in props`: wrap={undefined} would make the
		// block unbreakable across pages
		const { getByTestId } = render(<Block />);
		expect(getByTestId("rp-view").dataset.hasWrap).toBeUndefined();
	});

	it("renders children", () => {
		const { getByTestId } = render(
			<Block>
				<Text>hello</Text>
			</Block>,
		);
		expect(
			getByTestId("rp-view").querySelector("[data-testid='rp-text']"),
		).toBeTruthy();
	});
});

describe("view (deprecated alias)", () => {
	it("is the same component as Block", () => {
		expect(View).toBe(Block);
	});
});

describe(Text, () => {
	it("renders with className", () => {
		const { getByTestId } = render(<Text className="font-bold text-sm" />);
		const style = getStyle(getByTestId("rp-text"));
		expect(style).toStrictEqual([{ fontSize: 10.5, fontWeight: 700 }]);
	});

	it("renders children", () => {
		const { getByTestId } = render(<Text>Hello world</Text>);
		expect(getByTestId("rp-text").textContent).toBe("Hello world");
	});
});

describe(Page, () => {
	it("renders with className", () => {
		const { getByTestId } = render(<Page className="bg-white p-8" />);
		const style = getStyle(getByTestId("rp-page"));
		expect(style).toStrictEqual([
			{
				backgroundColor: "#ffffff",
				paddingBottom: 24,
				paddingLeft: 24,
				paddingRight: 24,
				paddingTop: 24,
			},
		]);
	});
});

describe(Link, () => {
	it("renders with className", () => {
		const { getByTestId } = render(
			<Link className="text-blue-500 underline" />,
		);
		const style = getStyle(getByTestId("rp-link"));
		expect(style).toStrictEqual([
			{ color: "#3b82f6", textDecoration: "underline" },
		]);
	});
});

describe(Document, () => {
	it("renders children", () => {
		const { getByTestId } = render(
			<Document>
				<Page />
			</Document>,
		);
		expect(
			getByTestId("rp-document").querySelector("[data-testid='rp-page']"),
		).toBeTruthy();
	});

	it("provides theme to children via theme prop", () => {
		const { getByTestId } = render(
			<Document theme={{ "--color-brand": "#ff6600" }}>
				<Text className="text-brand" />
			</Document>,
		);
		const style = getStyle(getByTestId("rp-text"));
		expect(style).toStrictEqual([{ color: "#ff6600" }]);
	});

	it("does not forward theme prop to react-pdf Document", () => {
		const { getByTestId } = render(
			<Document theme={{ "--color-brand": "#ff6600" }} title="Report" />,
		);
		const doc = getByTestId("rp-document");
		expect(doc.getAttribute("theme")).toBeNull();
		expect(doc.getAttribute("title")).toBe("Report");
	});
});

describe(Canvas, () => {
	it("renders with className", () => {
		const { getByTestId } = render(
			<Canvas className="h-full w-full" paint={() => null} />,
		);
		const style = getStyle(getByTestId("rp-canvas"));
		expect(style).toStrictEqual([{ height: "100%", width: "100%" }]);
	});
});

describe(Note, () => {
	it("renders with className", () => {
		const { getByTestId } = render(
			<Note className="bg-yellow-100 p-2">A note</Note>,
		);
		const style = getStyle(getByTestId("rp-note"));
		expect(style).toStrictEqual([
			{
				backgroundColor: "#fef9c3",
				paddingBottom: 6,
				paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 6,
			},
		]);
	});
});

describe("tailwind provider", () => {
	it("provides custom theme to children", () => {
		const { getByTestId } = render(
			<Tailwind theme={{ "--color-brand": "#ff6600" }}>
				<Text className="text-brand" />
			</Tailwind>,
		);
		const style = getStyle(getByTestId("rp-text"));
		expect(style).toStrictEqual([{ color: "#ff6600" }]);
	});

	it("uses default theme when no theme prop", () => {
		const { getByTestId } = render(
			<Tailwind>
				<Text className="text-red-500" />
			</Tailwind>,
		);
		const style = getStyle(getByTestId("rp-text"));
		expect(style).toStrictEqual([{ color: "#ef4444" }]);
	});

	it("custom theme colors override defaults", () => {
		const { getByTestId } = render(
			<Tailwind theme={{ "--color-red-500": "#ff0000" }}>
				<Text className="text-red-500" />
			</Tailwind>,
		);
		const style = getStyle(getByTestId("rp-text"));
		expect(style).toStrictEqual([{ color: "#ff0000" }]);
	});
});

describe(PageNumber, () => {
	it("renders with default render prop", () => {
		const { getByTestId } = render(<PageNumber className="text-sm" />);
		const el = getByTestId("rp-text");
		expect(getStyle(el)).toStrictEqual([{ fontSize: 10.5 }]);
		expect(el.dataset.render).toBe('"3 / 10"');
	});

	it("renders with custom render prop", () => {
		const { getByTestId } = render(
			<PageNumber render={({ pageNumber }) => `Page ${pageNumber}`} />,
		);
		expect(getByTestId("rp-text").dataset.render).toBe('"Page 3"');
	});
});

describe(Svg, () => {
	it("renders with className converted to style", () => {
		const { getByTestId } = render(<Svg className="h-24 w-full" />);
		const style = getStyle(getByTestId("rp-svg"));
		expect(style).toStrictEqual([{ height: 72, width: "100%" }]);
	});

	it("passes no style when neither className nor style provided", () => {
		const { getByTestId } = render(<Svg />);
		expect(getByTestId("rp-svg").dataset.style).toBeUndefined();
	});

	it("merges className and inline style", () => {
		const { getByTestId } = render(
			<Svg className="w-24" style={{ height: 100 }} />,
		);
		const style = getStyle(getByTestId("rp-svg"));
		expect(style).toStrictEqual([{ width: 72 }, { height: 100 }]);
	});
});

describe(G, () => {
	it("renders with className converted to style", () => {
		const { getByTestId } = render(<G className="opacity-50" />);
		const style = getStyle(getByTestId("rp-g"));
		expect(style).toStrictEqual([{ opacity: 0.5 }]);
	});
});

describe(SvgText, () => {
	it("renders with className converted to style", () => {
		const { getByTestId } = render(
			<SvgText className="font-bold text-sm" x={0} y={0} />,
		);
		const style = getStyle(getByTestId("rp-text"));
		expect(style).toStrictEqual([{ fontSize: 10.5, fontWeight: 700 }]);
	});
});
