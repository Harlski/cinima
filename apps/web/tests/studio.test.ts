import { describe, expect, it } from "vitest";
import { CREATOR_WALLET, CREATOR_WALLET_DISPLAY } from "@cinima/shared";
import {
  decideStudioOpen,
  formatActiveMs,
  studioEntryVisible,
} from "../src/lib/studio";

describe("Studio entry", () => {
  it("is visible only for the Creator wallet", () => {
    expect(studioEntryVisible(CREATOR_WALLET)).toBe(true);
    expect(studioEntryVisible(CREATOR_WALLET_DISPLAY)).toBe(true);
    expect(studioEntryVisible("NQ01 OTHER")).toBe(false);
    expect(studioEntryVisible(null)).toBe(false);
    expect(studioEntryVisible("")).toBe(false);
  });
});

describe("Studio open", () => {
  it("keeps the Creator on Studio when the snapshot fetch fails", () => {
    expect(
      decideStudioOpen({
        wallet: CREATOR_WALLET,
        fetchError: "not_found",
      })
    ).toEqual({ kind: "error", message: "not_found" });
  });

  it("sends a non-Creator Handle back to Me", () => {
    expect(decideStudioOpen({ wallet: "NQ01 OTHER" })).toEqual({
      kind: "redirect-me",
    });
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
