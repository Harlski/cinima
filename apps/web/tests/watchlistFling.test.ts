import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyWatchlistFlingOrder,
  shuffleVisibleWatchlistIds,
} from "@cinima/shared";
import {
  isWatchlistFling,
  isWatchlistFlingReorder,
  watchlistFlingToss,
  WATCHLIST_FLING_SETTLE_MS,
  WATCHLIST_FLING_TOSS_MS,
} from "../src/lib/watchlistFling";

describe("Watchlist fling order", () => {
  const mediaById = {
    m1: "movie",
    m2: "movie",
    m3: "movie",
    t1: "tv",
    t2: "tv",
  } as const;

  it("shuffles only the visible media type and leaves the other type in its slots", () => {
    const result = applyWatchlistFlingOrder({
      orderedIds: ["m1", "t1", "m2", "t2", "m3"],
      mediaById,
      mediaType: "movie",
      nextVisibleIds: ["m3", "m1", "m2"],
    });
    expect(result).toEqual({
      ok: true,
      orderedIds: ["m3", "t1", "m1", "t2", "m2"],
    });
  });

  it("rejects a fling when the visible type has fewer than two titles", () => {
    expect(
      applyWatchlistFlingOrder({
        orderedIds: ["m1", "t1", "t2"],
        mediaById,
        mediaType: "movie",
        nextVisibleIds: ["m1"],
      })
    ).toEqual({ ok: false, error: "too-few" });
  });

  it("rejects a next order that is not a permutation of the visible titles", () => {
    expect(
      applyWatchlistFlingOrder({
        orderedIds: ["m1", "t1", "m2", "t2", "m3"],
        mediaById,
        mediaType: "movie",
        nextVisibleIds: ["m3", "m1", "m9"],
      })
    ).toEqual({ ok: false, error: "not-permutation" });
  });

  it("rejects a fling that does not change Watchlist order", () => {
    expect(
      applyWatchlistFlingOrder({
        orderedIds: ["m1", "t1", "m2", "t2", "m3"],
        mediaById,
        mediaType: "movie",
        nextVisibleIds: ["m1", "m2", "m3"],
      })
    ).toEqual({ ok: false, error: "unchanged" });
  });

  it("draws a new visible order until the Watchlist actually mixes", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      return calls <= 2 ? 0.999 : 0;
    };
    expect(
      shuffleVisibleWatchlistIds(
        ["m1", "t1", "m2", "t2", "m3"],
        mediaById,
        "movie",
        random
      )
    ).toEqual({
      ok: true,
      orderedIds: ["m2", "t1", "m3", "t2", "m1"],
    });
  });
});

describe("Watchlist fling gesture", () => {
  it("treats a steep downward swipe as a Watchlist fling", () => {
    expect(isWatchlistFling(0, 80)).toBe(true);
    expect(isWatchlistFling(20, 80)).toBe(true);
  });

  it("ignores a tap, an upward swipe, and a mostly horizontal pan", () => {
    expect(isWatchlistFling(0, 8)).toBe(false);
    expect(isWatchlistFling(0, -80)).toBe(false);
    expect(isWatchlistFling(120, 20)).toBe(false);
  });

  it("detects a same-set reorder so the strip can mix in place", () => {
    expect(isWatchlistFlingReorder(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
    expect(isWatchlistFlingReorder(["a", "b"], ["a", "b"])).toBe(false);
    expect(isWatchlistFlingReorder(["a", "b"], ["a", "c"])).toBe(false);
    expect(isWatchlistFlingReorder(["a"], ["a"])).toBe(false);
  });

  it("tosses strip cards down and askew so a fling looks mixed", () => {
    const toss = watchlistFlingToss(0);
    expect(toss.y).toBeGreaterThan(0);
    expect(Math.abs(toss.rotate)).toBeGreaterThan(0);
    expect(WATCHLIST_FLING_TOSS_MS).toBeGreaterThan(0);
    expect(WATCHLIST_FLING_SETTLE_MS).toBeGreaterThan(WATCHLIST_FLING_TOSS_MS);
  });
});

describe("Watchlist fling wiring", () => {
  const pickerSrc = readFileSync(
    path.resolve(__dirname, "../src/components/TitleDeckPicker.vue"),
    "utf8"
  );
  const listSrc = readFileSync(
    path.resolve(__dirname, "../src/views/MyList.vue"),
    "utf8"
  );

  it("lets the Watchlist deck fling from the selected title", () => {
    expect(listSrc).toContain("allow-fling");
    expect(listSrc).toContain("@fling");
    expect(listSrc).toContain("shuffleVisibleWatchlistIds");
    expect(listSrc).toContain("persistFling");
    expect(pickerSrc).toContain("allowFling");
    expect(pickerSrc).toContain("strip--flingable");
  });
});
