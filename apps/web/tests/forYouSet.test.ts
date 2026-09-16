import { describe, expect, it } from "vitest";
import {
  FOR_YOU_PASS_MS,
  FOR_YOU_SET_SIZE,
  fifoForYouCandidateIds,
  isPassActive,
  nextForYouIds,
  remainingForYouIds,
  removeFromForYouIds,
  restoreTourForYouSet,
  shouldPrefetchForYou,
  stageTourForYouSet,
  upcomingForYouIds,
} from "@cinima/shared";

const HOUR_MS = 60 * 60 * 1000;

describe("For You set", () => {
  it("holds five titles", () => {
    expect(FOR_YOU_SET_SIZE).toBe(5);
  });

  it("keeps remaining titles when some are excluded", () => {
    expect(remainingForYouIds(["a", "b", "c", "d", "e"], new Set(["b", "d"]))).toEqual([
      "a",
      "c",
      "e",
    ]);
  });

  it("does not backfill after a Pass", () => {
    expect(removeFromForYouIds(["a", "b", "c", "d", "e"], "c")).toEqual([
      "a",
      "b",
      "d",
      "e",
    ]);
  });

  it("keeps the remaining set until it is empty", () => {
    const next = nextForYouIds(["a", "c"], ["a", "b", "c", "x", "y", "z"]);
    expect(next).toEqual({ ids: ["a", "c"], refilled: false });
  });

  it("deals five new candidates when the set is empty", () => {
    const next = nextForYouIds([], ["p", "q", "r", "s", "t", "u"]);
    expect(next).toEqual({ ids: ["p", "q", "r", "s", "t"], refilled: true });
  });

  it("deals fewer than five when the pool is thin", () => {
    expect(nextForYouIds([], ["p", "q"])).toEqual({ ids: ["p", "q"], refilled: true });
  });

  it("queues popular Catalog after taste overlap, without duplicates", () => {
    expect(fifoForYouCandidateIds(["a", "b"], ["b", "c", "d"])).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("peeks the next set without including titles still on screen", () => {
    expect(upcomingForYouIds(["a", "b"], ["a", "b", "c", "d", "e", "f", "g"])).toEqual([
      "c",
      "d",
      "e",
      "f",
      "g",
    ]);
  });

  it("warms the next set once two or fewer titles remain", () => {
    expect(shouldPrefetchForYou(5)).toBe(false);
    expect(shouldPrefetchForYou(3)).toBe(false);
    expect(shouldPrefetchForYou(2)).toBe(true);
    expect(shouldPrefetchForYou(1)).toBe(true);
    expect(shouldPrefetchForYou(0)).toBe(false);
  });
});

describe("Guided tour For You staging", () => {
  it("keeps the center Title and holds the rest out of the next refill", () => {
    expect(stageTourForYouSet(["a", "b", "c", "d", "e"])).toEqual({
      teachingIds: ["c"],
      holdOutIds: ["a", "b", "d", "e"],
    });
  });

  it("leaves a single Title as the teaching card", () => {
    expect(stageTourForYouSet(["c"])).toEqual({
      teachingIds: ["c"],
      holdOutIds: [],
    });
  });

  it("puts the teaching Title back in the center when the tour is skipped", () => {
    expect(restoreTourForYouSet(["c"], ["a", "b", "d", "e"])).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

describe("Pass cooldown", () => {
  it("hides a Title from For You for 48 hours", () => {
    expect(FOR_YOU_PASS_MS).toBe(48 * HOUR_MS);
    expect(isPassActive(0, 47 * HOUR_MS)).toBe(true);
    expect(isPassActive(0, 48 * HOUR_MS)).toBe(false);
  });
});
