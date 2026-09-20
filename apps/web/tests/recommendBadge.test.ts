import { describe, expect, it } from "vitest";
import { recommendBadgeMark } from "../src/lib/recommendBadge";

describe("Recommend badge mark", () => {
  it("puts Recommend counts of 1 through 10 inside the hex", () => {
    expect(recommendBadgeMark(1)).toEqual({ kind: "count", count: 1 });
    expect(recommendBadgeMark(10)).toEqual({ kind: "count", count: 10 });
  });

  it("spreads two empty hexes when more than 10 peers Recommended", () => {
    expect(recommendBadgeMark(11)).toEqual({ kind: "spread" });
  });
});
