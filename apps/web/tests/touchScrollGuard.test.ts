import { describe, expect, it } from "vitest";
import {
  canAbsorbVerticalScroll,
  nestedScrollHandoff,
  shouldBlockRubberBandScroll,
  unabsorbedVerticalDelta,
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

  it("lets a horizontal strip keep native flicks", () => {
    const strip: ScrollMetrics = {
      overflowY: "hidden",
      overflowX: "auto",
      scrollTop: 0,
      scrollHeight: 88,
      clientHeight: 88,
    };
    expect(shouldBlockRubberBandScroll([strip, ...searchChromeChain], 18)).toBe(
      false
    );
  });
});

const heatmapBox: ScrollMetrics = {
  overflowY: "auto",
  scrollTop: 0,
  scrollHeight: 800,
  clientHeight: 400,
};

const heatmapAtBottom: ScrollMetrics = {
  ...heatmapBox,
  scrollTop: 400,
};

const heatmapFits: ScrollMetrics = {
  overflowY: "auto",
  scrollTop: 0,
  scrollHeight: 240,
  clientHeight: 400,
};

const pageScroller: ScrollMetrics = {
  overflowY: "auto",
  scrollTop: 80,
  scrollHeight: 2000,
  clientHeight: 700,
};

const pageAtBottom: ScrollMetrics = {
  ...pageScroller,
  scrollTop: 1300,
};

describe("unabsorbedVerticalDelta", () => {
  it("returns 0 when the nested list can take the whole move", () => {
    expect(unabsorbedVerticalDelta(heatmapBox, 24)).toBe(0);
  });

  it("returns the whole move when the nested list is at the bottom", () => {
    expect(unabsorbedVerticalDelta(heatmapAtBottom, 24)).toBe(24);
  });

  it("returns leftover when the nested list hits the bottom mid-gesture", () => {
    expect(unabsorbedVerticalDelta({ ...heatmapBox, scrollTop: 390 }, 24)).toBe(
      14
    );
  });

  it("returns the whole move when the box does not overflow vertically", () => {
    expect(unabsorbedVerticalDelta(heatmapFits, 24)).toBe(24);
  });

  it("returns leftover when pulling past the top", () => {
    expect(unabsorbedVerticalDelta({ ...heatmapBox, scrollTop: 8 }, -24)).toBe(
      -16
    );
  });
});

describe("nestedScrollHandoff", () => {
  const cellChrome: ScrollMetrics = {
    overflowY: "visible",
    scrollTop: 0,
    scrollHeight: 32,
    clientHeight: 32,
  };

  it("hands leftover to the page when episode ratings are at the bottom", () => {
    expect(
      nestedScrollHandoff([cellChrome, heatmapAtBottom, pageScroller], 24)
    ).toEqual({
      nestedIndex: 1,
      nestedDelta: 0,
      ancestorIndex: 2,
      ancestorDelta: 24,
    });
  });

  it("does not intercept while the episode ratings can still scroll", () => {
    expect(
      nestedScrollHandoff([cellChrome, heatmapBox, pageScroller], 24)
    ).toBeNull();
  });

  it("scrolls the page when the ratings box does not overflow vertically", () => {
    expect(
      nestedScrollHandoff([cellChrome, heatmapFits, pageScroller], 18)
    ).toEqual({
      nestedIndex: 1,
      nestedDelta: 0,
      ancestorIndex: 2,
      ancestorDelta: 18,
    });
  });

  it("splits a gesture that lands on the nested bottom", () => {
    expect(
      nestedScrollHandoff(
        [cellChrome, { ...heatmapBox, scrollTop: 390 }, pageScroller],
        24
      )
    ).toEqual({
      nestedIndex: 1,
      nestedDelta: 10,
      ancestorIndex: 2,
      ancestorDelta: 14,
    });
  });

  it("does not chain when the page is also at the end", () => {
    expect(
      nestedScrollHandoff([heatmapAtBottom, pageAtBottom], 24)
    ).toBeNull();
  });
});
