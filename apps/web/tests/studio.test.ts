import { describe, expect, it } from "vitest";
import { CREATOR_WALLET, CREATOR_WALLET_DISPLAY } from "@cinima/shared";
import { formatActiveMs, studioEntryVisible } from "../src/lib/studio";

describe("Studio entry", () => {
  it("is visible only for the Creator wallet", () => {
    expect(studioEntryVisible(CREATOR_WALLET)).toBe(true);
    expect(studioEntryVisible(CREATOR_WALLET_DISPLAY)).toBe(true);
    expect(studioEntryVisible("NQ01 OTHER")).toBe(false);
    expect(studioEntryVisible(null)).toBe(false);
    expect(studioEntryVisible("")).toBe(false);
  });
});

describe("Presence label", () => {
  it("formats accumulated milliseconds", () => {
    expect(formatActiveMs(0)).toBe("<1m");
    expect(formatActiveMs(45_000)).toBe("<1m");
    expect(formatActiveMs(60_000)).toBe("1m");
    expect(formatActiveMs(3_600_000)).toBe("1h");
    expect(formatActiveMs(3_720_000)).toBe("1h 2m");
  });
});
