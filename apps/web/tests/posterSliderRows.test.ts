import { describe, expect, it } from "vitest";
import {
  posterFitLayout,
  posterSliderColsFit,
  posterSliderItemSlot,
  posterSliderLayout,
} from "../src/lib/posterSliderRows";

const poster = 116; // 7.25rem
const gap = 12;

describe("posterSliderLayout", () => {
  it("keeps 3 titles on one row when ~3 columns nearly fit", () => {
    const containerWidth = 2 * poster + gap + poster * 0.85;
    expect(posterSliderColsFit({ containerWidth, posterWidth: poster, gap })).toBe(3);
    expect(
      posterSliderLayout({
        itemCount: 3,
        containerWidth,
        posterWidth: poster,
        gap,
        maxRows: 2,
      })
    ).toEqual({ rows: 1, cols: 3 });
  });

  it("packs 4 titles row-major as 3 + 1", () => {
    const containerWidth = 3 * poster + 2 * gap;
    expect(
      posterSliderLayout({
        itemCount: 4,
        containerWidth,
        posterWidth: poster,
        gap,
        maxRows: 2,
      })
    ).toEqual({ rows: 2, cols: 3 });
  });

  it("expands columns when titles exceed two visible rows", () => {
    const containerWidth = 3 * poster + 2 * gap;
    expect(
      posterSliderLayout({
        itemCount: 10,
        containerWidth,
        posterWidth: poster,
        gap,
        maxRows: 2,
      })
    ).toEqual({ rows: 2, cols: 5 });
  });
});

describe("posterFitLayout", () => {
  it("keeps 1–3 recommends on a single equal-width row", () => {
    expect(posterFitLayout({ itemCount: 1 })).toEqual({ rows: 1, cols: 1 });
    expect(posterFitLayout({ itemCount: 2 })).toEqual({ rows: 1, cols: 2 });
    expect(posterFitLayout({ itemCount: 3 })).toEqual({ rows: 1, cols: 3 });
  });

  it("packs 4–6 recommends into two rows of three without scroll columns", () => {
    expect(posterFitLayout({ itemCount: 4 })).toEqual({ rows: 2, cols: 3 });
    expect(posterFitLayout({ itemCount: 5 })).toEqual({ rows: 2, cols: 3 });
    expect(posterFitLayout({ itemCount: 6 })).toEqual({ rows: 2, cols: 3 });
  });
});

describe("posterSliderItemSlot", () => {
  it("assigns row-major slots", () => {
    expect(posterSliderItemSlot(0, 3)).toEqual({ row: 1, col: 1 });
    expect(posterSliderItemSlot(1, 3)).toEqual({ row: 1, col: 2 });
    expect(posterSliderItemSlot(2, 3)).toEqual({ row: 1, col: 3 });
    expect(posterSliderItemSlot(3, 3)).toEqual({ row: 2, col: 1 });
  });
});
