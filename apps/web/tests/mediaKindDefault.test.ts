import { describe, expect, it } from "vitest";
import { pickDefaultMediaKind } from "../src/lib/mediaKindDefault";

describe("pickDefaultMediaKind", () => {
  it("opens TV when only TV has content", () => {
    expect(pickDefaultMediaKind(0, 4)).toBe("tv");
  });

  it("opens movies when only movies have content", () => {
    expect(pickDefaultMediaKind(3, 0)).toBe("movie");
  });

  it("prefers the larger side when both have content", () => {
    expect(pickDefaultMediaKind(2, 5)).toBe("tv");
    expect(pickDefaultMediaKind(5, 2)).toBe("movie");
  });

  it("prefers movies on ties or both empty", () => {
    expect(pickDefaultMediaKind(0, 0)).toBe("movie");
    expect(pickDefaultMediaKind(3, 3)).toBe("movie");
  });
});
