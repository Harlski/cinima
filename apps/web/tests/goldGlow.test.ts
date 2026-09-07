import { describe, expect, it } from "vitest";
import { goldGlowShellBleedPx } from "../src/lib/goldGlow";

describe("gold glow shell bleed", () => {
  it("gives the soft halo room for an 8px inset and 12px blur outside the button", () => {
    expect(goldGlowShellBleedPx(true)).toBeGreaterThanOrEqual(20);
  });

  it("gives the rim-only glow room for a 2px inset outside the button", () => {
    expect(goldGlowShellBleedPx(false)).toBeGreaterThanOrEqual(2);
  });
});
