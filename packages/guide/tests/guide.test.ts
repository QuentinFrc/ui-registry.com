import { describe, expect, it } from "vitest";
import {
  defineGuide,
  matchRoute,
  normalizeEntry,
  onPage,
} from "../src/guide.js";
import { createGuideStep } from "../src/step.js";

const one = createGuideStep({ id: "one" });
const two = createGuideStep({ id: "two" });
const three = createGuideStep({ id: "three" });
const hook = () => undefined;

describe("defineGuide", () => {
  it("applies defaults", () => {
    const guide = defineGuide({ id: "g", steps: [one] });
    expect(guide).toMatchObject({
      id: "g",
      version: 1,
      mode: "modal",
      trigger: { on: "manual" },
      when: undefined,
      dismissible: undefined,
      onMissing: undefined,
      waitTimeout: undefined,
      hookTimeout: undefined,
      onError: undefined,
    });
    expect(guide.steps).toEqual([{ step: one }]);
  });

  it("keeps explicit options", () => {
    const when = () => true;
    const onError = () => "skip" as const;
    const guide = defineGuide({
      id: "g",
      version: 3,
      mode: "passive",
      trigger: "manual",
      when,
      dismissible: false,
      onMissing: "end",
      waitTimeout: 10,
      hookTimeout: 20,
      onError,
      steps: [one],
    });
    expect(guide).toMatchObject({
      version: 3,
      mode: "passive",
      when,
      dismissible: false,
      onMissing: "end",
      waitTimeout: 10,
      hookTimeout: 20,
      onError,
    });
  });

  it("normalizes triggers", () => {
    const trigger = (value: Parameters<typeof defineGuide>[0]["trigger"]) =>
      defineGuide({ id: "g", trigger: value, steps: [one] }).trigger;
    expect(trigger("visible")).toEqual({
      on: "visible",
      delay: 0,
      threshold: 0.5,
    });
    expect(trigger({ on: "visible" })).toEqual({
      on: "visible",
      delay: 0,
      threshold: 0.5,
    });
    expect(trigger({ on: "visible", delay: 200, threshold: 1 })).toEqual({
      on: "visible",
      delay: 200,
      threshold: 1,
    });
  });

  it("normalizes bare steps and entries, frozen", () => {
    const guide = defineGuide({
      id: "g",
      steps: [one, { step: two, beforeEnter: hook, side: "top" }],
    });
    expect(guide.steps).toEqual([
      { step: one },
      { step: two, beforeEnter: hook, side: "top" },
    ]);
    expect(Object.isFrozen(guide)).toBe(true);
    expect(Object.isFrozen(guide.steps)).toBe(true);
    expect(Object.isFrozen(guide.steps[1])).toBe(true);
  });

  it("rejects duplicate steps", () => {
    expect(() => defineGuide({ id: "g", steps: [one, { step: one }] })).toThrow(
      '"one" appears more than once'
    );
    const clone = createGuideStep({ id: "one" });
    expect(() => defineGuide({ id: "g", steps: [one, clone] })).toThrow();
  });

  it("rejects an empty id or no steps", () => {
    expect(() => defineGuide({ id: "", steps: [one] })).toThrow("`id`");
    expect(() => defineGuide({ id: "g", steps: [] })).toThrow("at least one");
  });
});

describe("onPage", () => {
  it("sets the route on every entry, keeping hooks and overrides", () => {
    const entries = onPage("/groups", [
      one,
      { step: two, afterEnter: hook, align: "end", route: "/old" },
    ]);
    expect(entries).toEqual([
      { step: one, route: "/groups" },
      { step: two, afterEnter: hook, align: "end", route: "/groups" },
    ]);
  });

  it("accepts a route function and composes in defineGuide", () => {
    const route = (pathname: string) => pathname.startsWith("/deals");
    const guide = defineGuide({
      id: "g",
      steps: [...onPage("/a", [one]), ...onPage(route, [two]), three],
    });
    expect(guide.steps.map((entry) => entry.route)).toEqual([
      "/a",
      route,
      undefined,
    ]);
  });
});

describe("normalizeEntry", () => {
  it("copies entries", () => {
    const entry = { step: one };
    expect(normalizeEntry(entry)).not.toBe(entry);
    expect(normalizeEntry(one)).toEqual({ step: one });
  });
});

describe("matchRoute", () => {
  it("compares strings to the exact pathname without query or hash", () => {
    expect(matchRoute("/a", "/a")).toBe(true);
    expect(matchRoute("/a", "/a?x=1#h")).toBe(true);
    expect(matchRoute("/a?tab=2", "/a")).toBe(true);
    expect(matchRoute("/a", "/a/b")).toBe(false);
  });

  it("calls predicates with the stripped pathname", () => {
    expect(matchRoute((path) => path === "/a", "/a#top")).toBe(true);
  });
});
