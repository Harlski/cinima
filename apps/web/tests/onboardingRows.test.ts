import { describe, expect, it } from "vitest";
import { splitIntoRows } from "../src/lib/onboardingRows";

describe("splitIntoRows", () => {
  it("round-robins items across three rows", () => {
    expect(splitIntoRows([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([
      [1, 4, 7],
      [2, 5],
      [3, 6],
    ]);
  });

  it("returns empty rows when there are no items", () => {
    expect(splitIntoRows([], 3)).toEqual([[], [], []]);
  });

  it("returns no rows when rowCount is zero", () => {
    expect(splitIntoRows([1, 2], 0)).toEqual([]);
  });
});
