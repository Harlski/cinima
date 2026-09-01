import { describe, expect, it } from "vitest";
import {
  afterDesktopAlreadyInstalledClick,
  initialPayOnlyCoachState,
  shouldInterceptAlreadyInstalledClick,
} from "../src/lib/payOnlyCoach";

describe("pay-only desktop coach", () => {
  it("starts with glow on Already Installed and no tooltips", () => {
    expect(initialPayOnlyCoachState()).toEqual({
      glow: "alreadyInstalled",
      showFullAccessTooltip: false,
      showLearnPayTooltip: false,
    });
  });

  it("intercepts Already Installed only on the desktop Sorry gate", () => {
    expect(
      shouldInterceptAlreadyInstalledClick({
        coachEnabled: true,
        isDesktop: true,
      })
    ).toBe(true);
    expect(
      shouldInterceptAlreadyInstalledClick({
        coachEnabled: true,
        isDesktop: false,
      })
    ).toBe(false);
    expect(
      shouldInterceptAlreadyInstalledClick({
        coachEnabled: false,
        isDesktop: true,
      })
    ).toBe(false);
  });

  it("moves the glow to Get Nimiq Pay and opens both tooltips after a desktop click", () => {
    expect(
      afterDesktopAlreadyInstalledClick(initialPayOnlyCoachState())
    ).toEqual({
      glow: "getNimiqPay",
      showFullAccessTooltip: true,
      showLearnPayTooltip: true,
    });
  });
});
