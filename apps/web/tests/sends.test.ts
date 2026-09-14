import { describe, expect, it } from "vitest";
import {
  PING_LUNA,
  QUIET_AFTER_SYSTEM_PINGS,
  REWARDS_PER_DAY,
  REWARD_LUNA,
  SEND_MEMO_MAX_BYTES,
  SYSTEM_PING_LAPSE_MS,
  SYSTEM_PING_MIN_NEW_USERS,
  CREATOR_TEST_PING_MESSAGE,
  DIGEST_THANKER_CAP,
  RECEIVED_LIST_HEADING,
  USER_SEND_LUNA,
  USER_SEND_COST_LABEL,
  capDigestThankers,
  creatorPingMemo,
  decideSystemPing,
  defaultUserSendNoteId,
  isQuiet,
  isReturnPresence,
  isUserSendMemo,
  newUsersPingMemo,
  digestNimReceivedLabel,
  receivedNimLabel,
  receivedThanksHow,
  rewardMemo,
  rewardMemoFor,
  rewardsRemainingToday,
  shouldShowReturnDigest,
  truncateMemo,
  userSendMemo,
  userSendMemoForNote,
  userSendMemoOrDefault,
  USER_SEND_NOTES,
  watchlistPingMemo,
} from "@cinima/shared";

describe("Reward quota", () => {
  it("allows five Rewards per UTC day", () => {
    expect(REWARDS_PER_DAY).toBe(5);
    expect(REWARD_LUNA).toBe(100_000);
    expect(rewardsRemainingToday(0)).toBe(5);
    expect(rewardsRemainingToday(4)).toBe(1);
    expect(rewardsRemainingToday(5)).toBe(0);
    expect(rewardsRemainingToday(9)).toBe(0);
  });
});

describe("Ping amount", () => {
  it("is dust, not a Reward", () => {
    expect(PING_LUNA).toBe(10);
    expect(PING_LUNA).toBeLessThan(REWARD_LUNA);
  });
});

describe("Send memos", () => {
  it("names the thanker on a Reward", () => {
    expect(rewardMemo("alice")).toBe("alice thanked you on Cinima");
    expect(rewardMemoFor("alice", "NQ05THANKSTESTWALLETME00000000001")).toBe(
      "alice thanked you on Cinima"
    );
  });

  it("names a picked note on a User Send", () => {
    expect(userSendMemo("Thanks for the rec")).toBe("Thanks for the rec");
    expect(userSendMemoForNote("thanks-rec")).toBe("Thanks for the rec");
    expect(userSendMemoForNote("loved-take")).toBe("Loved this take");
    expect(isUserSendMemo("Thanks for the rec")).toBe(true);
    expect(isUserSendMemo("Loved this take")).toBe(true);
    expect(isUserSendMemo("alice thanked you on Cinima")).toBe(false);
    expect(isUserSendMemo("alice sent 1 NIM on Cinima")).toBe(false);
    expect(USER_SEND_LUNA).toBe(100_000);
    expect(USER_SEND_COST_LABEL).toBe("1 NIM");
    expect(USER_SEND_NOTES).toHaveLength(5);
    expect(defaultUserSendNoteId("title")).toBe("thanks-rec");
    expect(defaultUserSendNoteId("comment")).toBe("loved-take");
    expect(userSendMemoOrDefault("demo-user-send", "title")).toBe("Thanks for the rec");
    expect(userSendMemoOrDefault("demo-user-send", "comment")).toBe("Loved this take");
    expect(userSendMemoOrDefault("Thanks for the rec", "comment")).toBe("Thanks for the rec");
    for (const note of USER_SEND_NOTES) {
      expect(new TextEncoder().encode(userSendMemoForNote(note.id)).length).toBeLessThanOrEqual(
        SEND_MEMO_MAX_BYTES
      );
    }
  });

  it("names the Me Guestbook and +NIM on the card", () => {
    expect(RECEIVED_LIST_HEADING).toBe("Guestbook");
    expect(receivedNimLabel(1, 0)).toBe("+1 NIM");
    expect(receivedNimLabel(1, 1)).toBe("+2 NIM");
    expect(receivedNimLabel(0, 0)).toBeNull();
  });

  it("names why a Guestbook entry arrived", () => {
    expect(receivedThanksHow("title")).toBe("Thanked your recommendation");
    expect(receivedThanksHow("comment")).toBe("Thanked your comment");
  });

  it("uses a truncated wallet when the Handle is missing", () => {
    expect(rewardMemoFor(null, "NQ05THANKSTESTWALLETME00000000001")).toBe(
      "NQ05..0001 thanked you on Cinima"
    );
  });

  it("asks about a Watchlist title", () => {
    expect(watchlistPingMemo("Fight Club")).toBe(
      "Cinima.app - Have you watched: Fight Club yet?"
    );
  });

  it("names new Handles since last visit", () => {
    expect(newUsersPingMemo(12)).toBe("Cinima.app - 12 new users since last visit");
  });

  it("prefixes a Creator Ping", () => {
    expect(creatorPingMemo("come back")).toBe("Cinima.app - come back");
  });

  it("names the Creator self Ping as a Sender test", () => {
    expect(CREATOR_TEST_PING_MESSAGE).toBe("Sender test");
    expect(creatorPingMemo(CREATOR_TEST_PING_MESSAGE)).toBe("Cinima.app - Sender test");
  });

  it("fits Nimiq extra data", () => {
    const longTitle = "The Lord of the Rings: The Return of the King Extended Edition";
    const memo = watchlistPingMemo(longTitle);
    expect(new TextEncoder().encode(memo).length).toBeLessThanOrEqual(SEND_MEMO_MAX_BYTES);
    expect(memo.startsWith("Cinima.app - Have you watched: ")).toBe(true);
    expect(memo.endsWith(" yet?")).toBe(true);
    expect(truncateMemo("é".repeat(64)).length).toBeLessThan(64);
  });
});

describe("Return digest", () => {
  it("caps thanker Identicons at eight", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ walletAddress: `NQ${i}`, handle: `h${i}` }));
    expect(DIGEST_THANKER_CAP).toBe(8);
    expect(capDigestThankers(nine)).toHaveLength(8);
    expect(capDigestThankers(nine)[7]).toEqual({ walletAddress: "NQ7", handle: "h7" });
  });

  it("hides when onboarding, touring, or nothing arrived", () => {
    expect(
      shouldShowReturnDigest({ thanksCount: 2, nimReceived: 1, onboarding: true, tourActive: false })
    ).toBe(false);
    expect(
      shouldShowReturnDigest({ thanksCount: 2, nimReceived: 1, onboarding: false, tourActive: true })
    ).toBe(false);
    expect(
      shouldShowReturnDigest({ thanksCount: 0, nimReceived: 0, onboarding: false, tourActive: false })
    ).toBe(false);
    expect(
      shouldShowReturnDigest({ thanksCount: 1, nimReceived: 0, onboarding: false, tourActive: false })
    ).toBe(true);
    expect(
      shouldShowReturnDigest({ thanksCount: 0, nimReceived: 1, onboarding: false, tourActive: false })
    ).toBe(true);
  });

  it("names +NIM received on the panel", () => {
    expect(digestNimReceivedLabel(4)).toBe("+4 NIM received");
    expect(digestNimReceivedLabel(1)).toBe("+1 NIM received");
    expect(digestNimReceivedLabel(0)).toBeNull();
  });

  it("treats a Presence gap as a return, not the first heartbeat", () => {
    const now = 1_000_000;
    expect(isReturnPresence(null, now)).toBe(false);
    expect(isReturnPresence(now - 30_000, now)).toBe(false);
    expect(isReturnPresence(now - 90_001, now)).toBe(true);
  });
});

describe("Quiet", () => {
  it("starts after three System Pings since Presence", () => {
    expect(QUIET_AFTER_SYSTEM_PINGS).toBe(3);
    expect(isQuiet(2)).toBe(false);
    expect(isQuiet(3)).toBe(true);
  });
});

describe("System Ping", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 8, 11, 12, 0, 0);
  const lapsed = now - SYSTEM_PING_LAPSE_MS;

  const base = {
    isCreator: false,
    tourResolved: true,
    lastPresenceAt: lapsed,
    lastSystemPingAt: null as number | null,
    systemPingsSincePresence: 0,
    oldestWatchlistTitle: null as string | null,
    newUsersSincePresence: 0,
    now,
  };

  it("prefers the oldest Watchlist title", () => {
    expect(
      decideSystemPing({
        ...base,
        oldestWatchlistTitle: "Fight Club",
        newUsersSincePresence: 12,
      })
    ).toEqual({ kind: "watchlist", title: "Fight Club" });
  });

  it("falls back to new Handles when Watchlist is empty", () => {
    expect(
      decideSystemPing({
        ...base,
        newUsersSincePresence: SYSTEM_PING_MIN_NEW_USERS,
      })
    ).toEqual({ kind: "new-users", count: 3 });
  });

  it("skips Quiet Handles, the Creator, and the tour-gated", () => {
    expect(decideSystemPing({ ...base, systemPingsSincePresence: 3, oldestWatchlistTitle: "Dune" })).toEqual({
      kind: "skip",
      reason: "quiet",
    });
    expect(decideSystemPing({ ...base, isCreator: true, oldestWatchlistTitle: "Dune" })).toEqual({
      kind: "skip",
      reason: "creator",
    });
    expect(decideSystemPing({ ...base, tourResolved: false, oldestWatchlistTitle: "Dune" })).toEqual({
      kind: "skip",
      reason: "tour",
    });
  });

  it("skips recent Presence and cooldown", () => {
    expect(
      decideSystemPing({
        ...base,
        lastPresenceAt: now - day,
        oldestWatchlistTitle: "Dune",
      })
    ).toEqual({ kind: "skip", reason: "not-lapsed" });
    expect(
      decideSystemPing({
        ...base,
        lastSystemPingAt: now - day,
        oldestWatchlistTitle: "Dune",
      })
    ).toEqual({ kind: "skip", reason: "cooldown" });
    expect(decideSystemPing({ ...base, lastPresenceAt: null })).toEqual({
      kind: "skip",
      reason: "no-presence",
    });
  });

  it("skips when there is nothing to say", () => {
    expect(decideSystemPing({ ...base, newUsersSincePresence: 2 })).toEqual({
      kind: "skip",
      reason: "nothing-to-say",
    });
  });
});
