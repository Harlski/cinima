export const WATCHLIST_LEAVE_REASONS = [
  "finished",
  "not_for_me",
  "changed_mind",
] as const;

export type WatchlistLeaveReason = (typeof WATCHLIST_LEAVE_REASONS)[number];

export const WATCHLIST_LEAVE_REASON_LABELS: Record<WatchlistLeaveReason, string> = {
  finished: "Watched",
  not_for_me: "Not for me",
  changed_mind: "Changed my mind",
};

export const WATCHLIST_LEAVE_REASON_PLACEHOLDER = "Optional";

/** After a Watchlist leave, offer Thank all when unthanked Favoriters remain. */
export const THANK_ALL_CUE_MESSAGE = "Thank everyone who Favorited this?";
export const THANK_ALL_CUE_CONFIRM = "Thank all";
export const THANK_ALL_CUE_CANCEL = "Not now";

export function unthankedFavoriterCount(
  people: { thanked: boolean }[] | null | undefined
): number {
  return (people ?? []).filter((person) => !person.thanked).length;
}

export function shouldOfferThankAllCue(opts: {
  unthankedCount: number;
  tourActive: boolean;
}): boolean {
  return opts.unthankedCount > 0 && !opts.tourActive;
}

export function isWatchlistLeaveReason(value: string): value is WatchlistLeaveReason {
  return (WATCHLIST_LEAVE_REASONS as readonly string[]).includes(value);
}

/** Missing/blank is a valid skip. Anything else must be a known reason. */
export function parseWatchlistLeaveReason(
  raw: unknown
): { ok: true; reason: WatchlistLeaveReason | null } | { ok: false } {
  if (raw == null || raw === "") return { ok: true, reason: null };
  if (typeof raw !== "string") return { ok: false };
  if (isWatchlistLeaveReason(raw)) return { ok: true, reason: raw };
  return { ok: false };
}
