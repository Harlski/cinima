import { describe, expect, it } from "vitest";
import {
  deckScrollLeftToCenter,
  resolveDeckScrollIndex,
} from "../src/lib/deckSelection";

describe("resolveDeckScrollIndex", () => {
  it("keeps an explicitly clicked edge item when scroll snap centers a neighbor", () => {
    const clickedLast = 4;
    const nearestAfterScroll = 3;
    expect(resolveDeckScrollIndex(clickedLast, nearestAfterScroll)).toBe(clickedLast);
  });

  it("keeps an explicitly clicked first item when scroll snap centers the second", () => {
    const clickedFirst = 0;
    const nearestAfterScroll = 1;
    expect(resolveDeckScrollIndex(clickedFirst, nearestAfterScroll)).toBe(clickedFirst);
  });

  it("follows scroll position after the user drags the strip", () => {
    expect(resolveDeckScrollIndex(null, 2)).toBe(2);
  });
});

describe("deckScrollLeftToCenter", () => {
  it("centers the target poster and clamps to strip bounds", () => {
    const strip = {
      clientWidth: 300,
      scrollWidth: 700,
      children: [{ offsetLeft: 520, offsetWidth: 80 }],
    };
    expect(deckScrollLeftToCenter(strip, 0)).toBe(400);
    expect(
      deckScrollLeftToCenter(
        { ...strip, children: [{ offsetLeft: 0, offsetWidth: 80 }] },
        0
      )
    ).toBe(0);
  });
});
