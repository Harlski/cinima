import { describe, expect, it } from "vitest";
import { isLandingFrontDoor } from "../src/lib/landingGate";
import {
  isNimiqPayUserAgent,
  shouldAttemptPayBoot,
} from "../src/lib/nimiqPay";

describe("Landing front door", () => {
  it("matches landing and gate by name or path", () => {
    expect(isLandingFrontDoor({ name: "landing", path: "/" })).toBe(true);
    expect(isLandingFrontDoor({ name: "gate", path: "/gate" })).toBe(true);
    expect(isLandingFrontDoor({ name: undefined, path: "/" })).toBe(true);
    expect(isLandingFrontDoor({ name: undefined, path: "/gate" })).toBe(true);
    expect(isLandingFrontDoor({ name: "discover", path: "/discover" })).toBe(
      false
    );
  });
});

describe("Pay boot detection", () => {
  it("treats NimiqPay user agents as in-Pay even before injection", () => {
    expect(isNimiqPayUserAgent("Mozilla/5.0 NimiqPay/2.0")).toBe(true);
    expect(isNimiqPayUserAgent("Mozilla/5.0 (iPhone)")).toBe(false);
    expect(
      shouldAttemptPayBoot({
        hasToken: false,
        demoEnabled: false,
        inPay: false,
        payUserAgent: true,
      })
    ).toBe(true);
  });

  it("requires a Pay signal when there is no session or demo", () => {
    expect(
      shouldAttemptPayBoot({
        hasToken: false,
        demoEnabled: false,
        inPay: false,
        payUserAgent: false,
      })
    ).toBe(false);
    expect(
      shouldAttemptPayBoot({
        hasToken: false,
        demoEnabled: false,
        inPay: true,
        payUserAgent: false,
      })
    ).toBe(true);
  });
});
