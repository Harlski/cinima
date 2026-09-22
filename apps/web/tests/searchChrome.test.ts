import { describe, expect, it } from "vitest";
import { searchHintPinned } from "../src/lib/searchChrome";

describe("searchHintPinned", () => {
  it("shows the gold lookup hint when nothing has been searched or opened", () => {
    expect(
      searchHintPinned({
        showingHistory: true,
        recentSearchCount: 0,
        lookupCount: 0,
      })
    ).toBe(true);
  });

  it("hides the resting hint once a recent search or lookup exists", () => {
    expect(
      searchHintPinned({
        showingHistory: true,
        recentSearchCount: 1,
        lookupCount: 0,
      })
    ).toBe(false);
    expect(
      searchHintPinned({
        showingHistory: true,
        recentSearchCount: 0,
        lookupCount: 1,
      })
    ).toBe(false);
  });

  it("does not pin the hint over live results", () => {
    expect(
      searchHintPinned({
        showingHistory: false,
        recentSearchCount: 0,
        lookupCount: 0,
      })
    ).toBe(false);
  });
});
