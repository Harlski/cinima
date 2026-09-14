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
  JOIN_GRANT_HOW,
  JOIN_GRANT_LUNA,
  JOIN_GRANT_MEMO,
  JOIN_GRANT_NIM,
  JOIN_OVERLAY_NIM_LABEL,
  JOIN_OVERLAY_SUB,
  JOIN_OVERLAY_TITLE,
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
  joinGrantIdempotencyKey,
  joinGrantMemo,
  newUsersPingMemo,
  digestNimReceivedLabel,
  receivedHow,
  receivedNimLabel,
  receivedThanksHow,
  rewardMemo,
  rewardMemoFor,
  rewardsRemainingToday,
  shouldShowJoinOverlay,
  shouldShowReturnDigest,
  truncateMemo,
  userSendMemo,
  userSendMemoForNote,
  userSendMemoOrDefault,
  userSendNoteCostLabel,
  userSendNoteLuna,
  USER_SEND_NOTES,
  watchlistPingMemo,
  nimiqWatchTxUrl,
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
    expect(userSendMemo("Thanks")).toBe("Thanks");
    expect(userSendMemoForNote("thanks")).toBe("Thanks");
    expect(userSendMemoForNote("thanks-rec")).toBe("Thanks for the rec");
    expect(userSendMemoForNote("loved-take")).toBe("Loved this take");
    expect(userSendMemoForNote("loved-take", "alice")).toBe("Loved this take - alice");
    expect(userSendMemoForNote("thanks-rec", "alice")).toBe("Thanks for the rec - alice");
    expect(isUserSendMemo("Thanks")).toBe(true);
    expect(isUserSendMemo("Thanks for the rec")).toBe(true);
    expect(isUserSendMemo("Loved this take")).toBe(true);
    expect(isUserSendMemo("Loved this take - alice")).toBe(true);
    expect(isUserSendMemo("Thanks for the rec - alice")).toBe(true);
    expect(isUserSendMemo("alice thanked you on Cinima")).toBe(false);
    expect(isUserSendMemo("alice sent 1 NIM on Cinima")).toBe(false);
    expect(USER_SEND_LUNA).toBe(100_000);
    expect(USER_SEND_COST_LABEL).toBe("1 NIM");
    expect(USER_SEND_NOTES[0]).toEqual({ id: "thanks", label: "Thanks" });
    expect(USER_SEND_NOTES).toHaveLength(6);
    expect(defaultUserSendNoteId("title")).toBe("thanks");
    expect(defaultUserSendNoteId("comment")).toBe("thanks");
    expect(userSendNoteLuna("thanks")).toBe(0);
    expect(userSendNoteCostLabel("thanks")).toBe("Free");
    expect(userSendNoteLuna("thanks-rec")).toBe(USER_SEND_LUNA);
    expect(userSendNoteCostLabel("loved-take")).toBe("1 NIM");
    for (const note of USER_SEND_NOTES) {
      if (note.id === "thanks") continue;
      expect(userSendNoteLuna(note.id)).toBe(USER_SEND_LUNA);
    }
    expect(userSendMemoOrDefault("demo-user-send", "title")).toBe("Thanks for the rec");
    expect(userSendMemoOrDefault("demo-user-send", "comment")).toBe("Loved this take");
    expect(userSendMemoOrDefault("Thanks for the rec", "comment")).toBe("Thanks for the rec");
    expect(userSendMemoOrDefault("Loved this take - alice", "comment")).toBe("Loved this take - alice");
    expect(isUserSendMemo("Thanks - alice")).toBe(true);
    expect(new TextEncoder().encode(userSendMemoForNote("loved-take", "a".repeat(80))).length).toBeLessThanOrEqual(
      SEND_MEMO_MAX_BYTES
    );
    expect(
      nimiqWatchTxUrl("0xF6AB3B34E0569E6E5733820D90C8A5BF98EADC317E398464A9A405423B5E5D37")
    ).toBe("https://nimiq.watch/#f6ab3b34e0569e6e5733820d90c8a5bf98eadc317e398464a9a405423b5e5d37");
    expect(nimiqWatchTxUrl("demo:user-send:1")).toBeNull();
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
    expect(receivedHow("join")).toBe("Joined Cinima");
    expect(receivedHow("title")).toBe("Thanked your recommendation");
    expect(receivedNimLabel(0, 10)).toBe("+10 NIM");
  });

  it("names a 10 NIM Join grant and the returning Join overlay", () => {
    expect(JOIN_GRANT_NIM).toBe(10);
    expect(JOIN_GRANT_LUNA).toBe(1_000_000);
    expect(joinGrantMemo()).toBe("Joined Cinima");
    expect(JOIN_GRANT_MEMO).toBe("Joined Cinima");
    expect(JOIN_GRANT_HOW).toBe("Joined Cinima");
    expect(joinGrantIdempotencyKey("NQ05JOINTESTWALLET000000000000001")).toBe(
      "join:NQ05JOINTESTWALLET000000000000001"
    );
    expect(JOIN_OVERLAY_TITLE).toBe("Thanks for joining Cinima");
    expect(JOIN_OVERLAY_SUB).toBe("Thanks for coming back!");
    expect(JOIN_OVERLAY_NIM_LABEL).toBe("+10 NIM");
    expect(
      shouldShowJoinOverlay({ pending: true, onboarding: false, tourActive: false })
    ).toBe(true);
    expect(
      shouldShowJoinOverlay({ pending: true, onboarding: true, tourActive: false })
    ).toBe(false);
    expect(
      shouldShowJoinOverlay({ pending: true, onboarding: false, tourActive: true })
    ).toBe(false);
    expect(
      shouldShowJoinOverlay({ pending: false, onboarding: false, tourActive: false })
    ).toBe(false);
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

  it("hides when onboarding, touring, Join overlay is waiting, or nothing arrived", () => {
    expect(
      shouldShowReturnDigest({ thanksCount: 2, nimReceived: 1, onboarding: true, tourActive: false })
    ).toBe(false);
    expect(
      shouldShowReturnDigest({ thanksCount: 2, nimReceived: 1, onboarding: false, tourActive: true })
    ).toBe(false);
    expect(
      shouldShowReturnDigest({
        thanksCount: 2,
        nimReceived: 1,
        onboarding: false,
        tourActive: false,
        joinOverlayPending: true,
      })
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
