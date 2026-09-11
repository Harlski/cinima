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
