import { describe, expect, it } from "vitest";
import { formatTitleRating, hasTitleRating } from "../src/lib/titleRating";

describe("titleRating", () => {
  it("formats numeric ratings including zero", () => {
    expect(formatTitleRating(8.4)).toBe("8.4");
    expect(formatTitleRating(0)).toBe("0.0");
    expect(hasTitleRating(0)).toBe(true);
  });

  it("uses an unrated placeholder when missing", () => {
    expect(formatTitleRating(null)).toBe("—");
    expect(formatTitleRating(undefined)).toBe("—");
    expect(hasTitleRating(null)).toBe(false);
  });
});
