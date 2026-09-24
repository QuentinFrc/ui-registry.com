import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createSwappable } from "../src/index.js";

type Variant = "mobile" | "desktop";

const Title = ({ text, sub }: { text: string; sub?: string }) => (
  <h1>
    {text}
    {sub ? ` / ${sub}` : null}
  </h1>
);
const TitleMobile = ({ text }: { text: string }) => <h2>{text}</h2>;
const Sidebar = ({ items }: { items: string[] }) => (
  <nav>{items.join(",")}</nav>
);
// Renders received props as `key=value` pairs so injected props are observable.
const Probe = (props: Record<string, unknown>) => (
  <span>
    {Object.entries(props)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(" ")}
  </span>
);

const Layout = createSwappable({
  name: "Layout",
  variants: ["mobile", "desktop"],
  fallback: "desktop",
  useVariant: ({ variant }: { variant: Variant }) => variant,
})({
  Title: { mobile: TitleMobile, desktop: Title },
  Sidebar: { mobile: null, desktop: Sidebar },
  BottomBar: { mobile: Probe, desktop: null },
  Probe: { desktop: Probe },
});

const render = (variant: Variant, ui: React.ReactNode) =>
  renderToStaticMarkup(
    <Layout.Provider variant={variant}>{ui}</Layout.Provider>
  );

describe("slots", () => {
  it("renders the implementation of the current variant", () => {
    expect(render("desktop", <Layout.Title sub="there" text="Hi" />)).toBe(
      "<h1>Hi / there</h1>"
    );
    expect(render("mobile", <Layout.Title sub="there" text="Hi" />)).toBe(
      "<h2>Hi</h2>"
    );
  });

  it("renders nothing for an explicit null implementation", () => {
    expect(render("mobile", <Layout.Sidebar items={["a"]} />)).toBe("");
    expect(render("desktop", <Layout.BottomBar />)).toBe("");
  });

  it("falls back to the fallback implementation when a variant is missing", () => {
    expect(render("mobile", <Layout.Probe />)).toBe(
      "<span>data-variant=mobile</span>"
    );
  });

  it("injects variantProps, caller props win", () => {
    expect(render("desktop", <Layout.Probe />)).toBe(
      "<span>data-variant=desktop</span>"
    );
    expect(render("desktop", <Layout.Probe data-variant="custom" />)).toBe(
      "<span>data-variant=custom</span>"
    );
  });

  it("exposes one sub-component per variant that renders only in that variant", () => {
    expect(render("mobile", <Layout.Title.mobile text="m" />)).toBe(
      "<h2>m</h2>"
    );
    expect(render("desktop", <Layout.Title.mobile text="m" />)).toBe("");
    expect(render("desktop", <Layout.Title.desktop text="d" />)).toBe(
      "<h1>d</h1>"
    );
    // placement decides when, fallback decides what
    expect(render("mobile", <Layout.Probe.mobile />)).toBe(
      "<span>data-variant=mobile</span>"
    );
  });

  it("sets displayNames", () => {
    expect(Layout.Provider.displayName).toBe("Layout.Provider");
    expect(Layout.Title.displayName).toBe("Layout.Title");
    expect(Layout.Title.mobile.displayName).toBe("Layout.Title.mobile");
  });

  it("exposes variants and fallback", () => {
    expect(Layout.variants).toEqual(["mobile", "desktop"]);
    expect(Layout.fallback).toBe("desktop");
  });
});

describe("Match", () => {
  it("renders children only for the given variant(s)", () => {
    const ui = <Layout.Match variant="mobile">yes</Layout.Match>;
    expect(render("mobile", ui)).toBe("yes");
    expect(render("desktop", ui)).toBe("");

    const both = (
      <Layout.Match variant={["mobile", "desktop"]}>yes</Layout.Match>
    );
    expect(render("mobile", both)).toBe("yes");
    expect(render("desktop", both)).toBe("yes");
  });
});

describe("hooks", () => {
  it("useVariant and useVariantProps read the current variant", () => {
    const Reader = () => {
      const variant = Layout.useVariant();
      const props = Layout.useVariantProps();
      return <i>{`${variant}:${String(props["data-variant"])}`}</i>;
    };
    expect(render("mobile", <Reader />)).toBe("<i>mobile:mobile</i>");
  });

  it("throws outside Provider", () => {
    expect(() => renderToStaticMarkup(<Layout.Title text="x" />)).toThrow(
      "Layout: components must be rendered inside Layout.Provider"
    );
  });
});

describe("guards", () => {
  it("throws when fallback is not a variant", () => {
    expect(() =>
      createSwappable({
        variants: ["a", "b"],
        // @ts-expect-error runtime guard
        fallback: "c",
        useVariant: () => "a",
      })
    ).toThrow('Swappable: fallback "c" is not one of variants [a, b]');
  });

  it("throws when useVariant returns an unknown variant", () => {
    const Broken = createSwappable({
      name: "Broken",
      variants: ["a", "b"],
      fallback: "a",
      useVariant: () => "zzz" as "a",
    })({});
    expect(() =>
      renderToStaticMarkup(<Broken.Provider>x</Broken.Provider>)
    ).toThrow('Broken: useVariant returned "zzz", expected one of [a, b]');
  });

  it("throws on reserved slot names", () => {
    expect(() =>
      createSwappable({
        variants: ["a"],
        fallback: "a",
        useVariant: () => "a",
      })({ Provider: { a: Probe } })
    ).toThrow('Swappable: "Provider" is a reserved key');
  });
});

describe("custom variantProps", () => {
  it("replaces the default injection", () => {
    const Themed = createSwappable({
      variants: ["light", "dark"],
      fallback: "light",
      useVariant: () => "dark" as "light" | "dark",
      variantProps: ({ variant }) => ({ className: `theme-${variant}` }),
    })({ Box: { light: Probe } });
    expect(
      renderToStaticMarkup(
        <Themed.Provider>
          <Themed.Box />
        </Themed.Provider>
      )
    ).toBe("<span>className=theme-dark</span>");
  });
});
