import { describe, expect, it } from "vitest";
import {
  parseWatchlistLeaveReason,
  THANK_ALL_CUE_CANCEL,
  THANK_ALL_CUE_CONFIRM,
  THANK_ALL_CUE_MESSAGE,
  WATCHLIST_LEAVE_REASON_LABELS,
  shouldOfferThankAllCue,
  unthankedFavoriterCount,
} from "@cinima/shared";
import { removeFromWatchlistMessage } from "../src/lib/titleActionLabels";

describe("Watchlist leave copy", () => {
  it("uses short leave-reason labels", () => {
    expect(WATCHLIST_LEAVE_REASON_LABELS.finished).toBe("Watched");
    expect(WATCHLIST_LEAVE_REASON_LABELS.not_for_me).toBe("Not for me");
    expect(WATCHLIST_LEAVE_REASON_LABELS.changed_mind).toBe("Changed my mind");
  });

  it("treats blank as a skipped reason and rejects unknown values", () => {
    expect(parseWatchlistLeaveReason(undefined)).toEqual({ ok: true, reason: null });
    expect(parseWatchlistLeaveReason("")).toEqual({ ok: true, reason: null });
    expect(parseWatchlistLeaveReason("finished")).toEqual({ ok: true, reason: "finished" });
    expect(parseWatchlistLeaveReason("watched")).toEqual({ ok: false });
  });

  it("keeps leave copy short", () => {
    expect(removeFromWatchlistMessage("Inception")).toBe(
      "Remove Inception from Watchlist?"
    );
  });

  it("omits the Title name when the leave dialog already shows a title card", () => {
    expect(removeFromWatchlistMessage()).toBe("Remove from Watchlist?");
  });
});

describe("Watchlist leave Thank all cue", () => {
  it("offers Thank all without naming the Title again", () => {
    expect(THANK_ALL_CUE_MESSAGE).toBe("Thank everyone who Favorited this?");
    expect(THANK_ALL_CUE_CONFIRM).toBe("Thank all");
    expect(THANK_ALL_CUE_CANCEL).toBe("Not now");
  });

  it("counts remaining unthanked Favoriters", () => {
    expect(
      unthankedFavoriterCount([
        { thanked: true },
        { thanked: false },
        { thanked: false },
      ])
    ).toBe(2);
  });

  it("offers only when unthanked Favoriters remain and the Guided tour is not running", () => {
    expect(shouldOfferThankAllCue({ unthankedCount: 2, tourActive: false })).toBe(
      true
    );
    expect(shouldOfferThankAllCue({ unthankedCount: 0, tourActive: false })).toBe(
      false
    );
    expect(shouldOfferThankAllCue({ unthankedCount: 2, tourActive: true })).toBe(
      false
    );
  });
});
