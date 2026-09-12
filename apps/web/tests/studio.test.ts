import { describe, expect, it } from "vitest";
import { CREATOR_TEST_PING_MESSAGE, CREATOR_WALLET, CREATOR_WALLET_DISPLAY } from "@cinima/shared";
import {
  creatorPingBody,
  creatorSelfPingRequest,
  decideStudioOpen,
  formatActiveMs,
  formatShareVisitCounts,
  studioEntryVisible,
  studioProfileLocation,
  suggestPingHandles,
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

describe("Studio profile links", () => {
  it("opens the in-app profile for a wallet", () => {
    expect(studioProfileLocation(CREATOR_WALLET)).toEqual({
      name: "user",
      params: { wallet: CREATOR_WALLET },
    });
    expect(studioProfileLocation("  ")).toBeNull();
    expect(studioProfileLocation(null)).toBeNull();
  });
});

describe("Share visit counts", () => {
  it("labels web, pay, and Pay intent with literals", () => {
    expect(
      formatShareVisitCounts({ webCount: 3, payCount: 1, payCtaCount: 2 })
    ).toBe("3 web · 1 pay · 2 Pay intent");
  });
});

describe("Creator self Ping", () => {
  it("queues a Sender test to the Creator wallet", () => {
    expect(creatorSelfPingRequest()).toEqual({
      toWallet: CREATOR_WALLET,
      message: CREATOR_TEST_PING_MESSAGE,
    });
  });
});

describe("Studio Ping Handles", () => {
  const people = [
    { walletAddress: "NQ05A", handle: "alice" },
    { walletAddress: "NQ05B", handle: "alicia" },
    { walletAddress: "NQ05C", handle: "bob" },
    { walletAddress: "NQ05D", handle: null },
  ];

  it("suggests Handles as the Creator types", () => {
    expect(suggestPingHandles(people, "al", []).map((p) => p.handle)).toEqual([
      "alice",
      "alicia",
    ]);
  });

  it("omits already selected Handles", () => {
    expect(suggestPingHandles(people, "al", ["NQ05A"]).map((p) => p.handle)).toEqual(["alicia"]);
  });

  it("builds a bulk Creator Ping body", () => {
    expect(
      creatorPingBody(
        [
          { walletAddress: "NQ05A" },
          { walletAddress: "NQ05C" },
        ],
        "watch this"
      )
    ).toEqual({
      toWallets: ["NQ05A", "NQ05C"],
      message: "watch this",
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
