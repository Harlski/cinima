import { describe, expect, it } from "vitest";
import {
  canAbsorbVerticalScroll,
  shouldBlockRubberBandScroll,
  type ScrollMetrics,
} from "../src/lib/touchScrollGuard";

/** Non-scrollable search chrome (empty history / search bar) over a full-height shell. */
const searchChromeChain: ScrollMetrics[] = [
  {
    overflowY: "visible",
    scrollTop: 0,
    scrollHeight: 40,
    clientHeight: 40,
  },
  {
    overflowY: "auto",
    scrollTop: 0,
    scrollHeight: 700,
    clientHeight: 700,
  },
];

const resultsList: ScrollMetrics = {
  overflowY: "auto",
  scrollTop: 0,
  scrollHeight: 1200,
  clientHeight: 400,
};

describe("canAbsorbVerticalScroll", () => {
  it("rejects elements that are not vertically scrollable", () => {
    expect(
      canAbsorbVerticalScroll(
        {
          overflowY: "visible",
          scrollTop: 0,
          scrollHeight: 40,
          clientHeight: 40,
        },
        12
      )
    ).toBe(false);
  });

  it("allows scrolling down when the list has room below", () => {
    expect(canAbsorbVerticalScroll(resultsList, 12)).toBe(true);
  });

  it("blocks pulling past the top of a list", () => {
    expect(canAbsorbVerticalScroll(resultsList, -12)).toBe(false);
  });
});

describe("shouldBlockRubberBandScroll", () => {
  it("blocks vertical drag on Search chrome that cannot scroll", () => {
    expect(shouldBlockRubberBandScroll(searchChromeChain, 18)).toBe(true);
    expect(shouldBlockRubberBandScroll(searchChromeChain, -18)).toBe(true);
  });

  it("allows drag when a nested results list can still scroll", () => {
    expect(
      shouldBlockRubberBandScroll([resultsList, ...searchChromeChain], 18)
    ).toBe(false);
  });

  it("blocks overscroll once the nested list is at the top", () => {
    expect(
      shouldBlockRubberBandScroll([resultsList, ...searchChromeChain], -18)
    ).toBe(true);
  });

  it("does not block a zero move", () => {
    expect(shouldBlockRubberBandScroll(searchChromeChain, 0)).toBe(false);
  });
});
