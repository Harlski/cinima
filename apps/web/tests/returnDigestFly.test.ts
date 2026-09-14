import { describe, expect, it } from "vitest";
import {
  DIGEST_FLY_MS,
  DIGEST_FLY_STAGGER_MS,
  digestFaceFly,
  digestFlySettleMs,
} from "../src/lib/returnDigestFly";

describe("Return digest fly to Me", () => {
  it("moves a face center onto the Me Identicon and shrinks to match it", () => {
    expect(
      digestFaceFly(
        { left: 0, top: 0, width: 56, height: 56 },
        { left: 100, top: 200, width: 26, height: 26 }
      )
    ).toEqual({
      dx: 113 - 28,
      dy: 213 - 28,
      scale: 26 / 56,
    });
  });

  it("waits for the last staggered face before settling", () => {
    expect(digestFlySettleMs(0)).toBe(0);
    expect(digestFlySettleMs(1)).toBe(DIGEST_FLY_MS);
    expect(digestFlySettleMs(8)).toBe(DIGEST_FLY_MS + 7 * DIGEST_FLY_STAGGER_MS);
  });
});
