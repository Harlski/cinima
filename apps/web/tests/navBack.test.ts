import { describe, expect, it } from "vitest";
import { creditsBackAction, hasInAppHistoryBack } from "../src/lib/navBack";

describe("hasInAppHistoryBack", () => {
  it("is false with no history state", () => {
    expect(hasInAppHistoryBack(null)).toBe(false);
    expect(hasInAppHistoryBack(undefined)).toBe(false);
    expect(hasInAppHistoryBack({})).toBe(false);
    expect(hasInAppHistoryBack({ back: null })).toBe(false);
    expect(hasInAppHistoryBack({ back: "" })).toBe(false);
  });

  it("is true when Vue Router recorded a previous entry", () => {
    expect(hasInAppHistoryBack({ back: "/discover" })).toBe(true);
    expect(hasInAppHistoryBack({ back: "/search?q=a" })).toBe(true);
  });
});

describe("Credits Back", () => {
  it("returns to in-app history when it exists, otherwise Me", () => {
    expect(creditsBackAction({ back: "/title/movie:550" })).toBe("history");
    expect(creditsBackAction({})).toBe("me");
    expect(creditsBackAction(null)).toBe("me");
  });
});
