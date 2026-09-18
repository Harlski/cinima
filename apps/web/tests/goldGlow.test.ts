import { describe, expect, it } from "vitest";
import {
  goldGlowHaloBlurPx,
  goldGlowRimInsetPx,
  goldGlowRimWidthPx,
  goldGlowShellBleedPx,
} from "../src/lib/goldGlow";

describe("gold glow shell bleed", () => {
  it("gives the soft halo room for an 8px inset and 12px blur outside the button", () => {
    expect(goldGlowShellBleedPx(true)).toBeGreaterThanOrEqual(20);
  });

  it("gives the rim-only glow room for a 2px inset outside the button", () => {
    expect(goldGlowShellBleedPx(false)).toBeGreaterThanOrEqual(2);
  });

  it("gives the strong tour glow a thicker rim and more room than the rim-only outline", () => {
    expect(goldGlowShellBleedPx(false, true)).toBeGreaterThan(goldGlowShellBleedPx(false));
    expect(goldGlowShellBleedPx(false, true)).toBeGreaterThanOrEqual(26);
    expect(goldGlowRimWidthPx(true)).toBeGreaterThan(goldGlowRimWidthPx(false));
    expect(goldGlowRimInsetPx(true)).toBeGreaterThan(goldGlowRimInsetPx(false));
    expect(goldGlowHaloBlurPx(true)).toBeGreaterThan(goldGlowHaloBlurPx(false));
  });
});
