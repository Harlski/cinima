import { describe, expect, it } from "vitest";
import {
  parseWatchlistLeaveReason,
  WATCHLIST_LEAVE_REASON_LABELS,
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
