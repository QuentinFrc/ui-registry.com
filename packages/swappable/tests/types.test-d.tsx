import { describe, expectTypeOf, it } from "vitest";
import { createSwappable, defineConfig } from "../src/index.js";

const Title = ({ text, sub }: { text: string; sub?: string }) => (
  <h1>{`${text}${sub ?? ""}`}</h1>
);
const TitleMobile = ({ text }: { text: string }) => <h2>{text}</h2>;
const Sidebar = ({ items }: { items: string[] }) => <nav>{items.length}</nav>;
const Counter = ({ count }: { count: number }) => <b>{count}</b>;

const responsive = createSwappable({
  variants: ["mobile", "desktop"],
  fallback: "desktop",
  useVariant: ({ wide }: { wide: boolean }) => (wide ? "desktop" : "mobile"),
});

describe("config", () => {
  it("checks useVariant against variants", () => {
    createSwappable({
      variants: ["mobile", "desktop"],
      fallback: "desktop",
      // @ts-expect-error "tablet" is not a variant
      useVariant: (): "mobile" | "tablet" => "mobile",
    });
  });

  it("checks fallback against variants", () => {
    createSwappable({
      variants: ["mobile", "desktop"],
      // @ts-expect-error "tablet" is not a variant
      fallback: "tablet",
      useVariant: () => "mobile",
    });
  });

  it("types Provider props from useVariant args", () => {
    const Layout = responsive({});
    expectTypeOf(Layout.Provider).parameter(0).toMatchObjectType<{
      wide: boolean;
    }>();

    const NoArgs = createSwappable({
      variants: ["a"],
      fallback: "a",
      useVariant: () => "a",
    })({});
    <NoArgs.Provider>x</NoArgs.Provider>;
  });
});

describe("slots", () => {
  it("infers slot props from the fallback implementation", () => {
    const Layout = responsive({
      Title: { mobile: TitleMobile, desktop: Title },
      Sidebar: { mobile: null, desktop: Sidebar },
    });
    <Layout.Title sub="s" text="hi" />;
    <Layout.Sidebar items={["a"]} />;
    // @ts-expect-error text must be a string
    <Layout.Title text={1} />;
    // @ts-expect-error items is required
    <Layout.Sidebar />;
  });

  it("uses the other implementations when the fallback is null", () => {
    const Layout = responsive({
      BottomBar: { mobile: TitleMobile, desktop: null },
    });
    <Layout.BottomBar text="hi" />;
    // @ts-expect-error text is required
    <Layout.BottomBar />;
  });

  it("rejects an implementation incompatible with the contract", () => {
    responsive({
      // @ts-expect-error Counter requires `count`, contract is { text; sub? }
      Title: { mobile: Counter, desktop: Title },
    });
  });

  it("rejects unknown variant keys", () => {
    responsive({
      // @ts-expect-error "desktp" is not a variant
      Title: { mobile: TitleMobile, desktp: Title },
    });
  });

  it("exposes typed sub-components per variant", () => {
    const Layout = responsive({
      Title: { mobile: TitleMobile, desktop: Title },
    });
    <Layout.Title.mobile text="hi" />;
    <Layout.Title.desktop sub="s" text="hi" />;
    // @ts-expect-error text must be a string
    <Layout.Title.desktop text={1} />;
    // @ts-expect-error tablet is not a variant
    Layout.Title.tablet;
  });
});

describe("Match and hooks", () => {
  const Layout = responsive({});

  it("types Match variant", () => {
    <Layout.Match variant="mobile">x</Layout.Match>;
    <Layout.Match variant={["mobile", "desktop"]}>x</Layout.Match>;
    // @ts-expect-error tablet is not a variant
    <Layout.Match variant="tablet">x</Layout.Match>;
  });

  it("types useVariant", () => {
    expectTypeOf(Layout.useVariant).returns.toEqualTypeOf<
      "mobile" | "desktop"
    >();
  });
});

describe("defineConfig", () => {
  it("keeps literal types when spread into createSwappable", () => {
    const shared = defineConfig({
      variants: ["mobile", "desktop"],
      fallback: "desktop",
      useVariant: ({ initial }: { initial: "mobile" | "desktop" }) => initial,
    });
    const Layout = createSwappable({ ...shared, name: "Layout" })({});
    expectTypeOf(Layout.useVariant).returns.toEqualTypeOf<
      "mobile" | "desktop"
    >();
    <Layout.Provider initial="mobile">x</Layout.Provider>;
    // @ts-expect-error initial is required
    <Layout.Provider>x</Layout.Provider>;
  });
});
