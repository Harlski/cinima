export const WATCHLIST_FLING_DY = 56;
export const WATCHLIST_FLING_TOSS_MS = 220;
export const WATCHLIST_FLING_SETTLE_MS = 480;

export function isWatchlistFling(
  dx: number,
  dy: number,
  threshold = WATCHLIST_FLING_DY
): boolean {
  if (dy < threshold) return false;
  return Math.abs(dy) >= Math.abs(dx) * 1.25;
}

export function isWatchlistFlingReorder(
  previousIds: readonly string[],
  nextIds: readonly string[]
): boolean {
  if (previousIds.length < 2 || previousIds.length !== nextIds.length) return false;
  if (previousIds.join("|") === nextIds.join("|")) return false;
  const prev = [...previousIds].sort().join("|");
  const next = [...nextIds].sort().join("|");
  return prev === next;
}

export type WatchlistFlingToss = {
  x: number;
  y: number;
  rotate: number;
};

function unit(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

/** Deterministic scatter so a Watchlist fling tosses cards down and askew. */
export function watchlistFlingToss(seed: number): WatchlistFlingToss {
  const a = unit(seed + 1.7);
  const b = unit(seed + 4.2);
  const rotate = (a - 0.5) * 32;
  return {
    x: (a - 0.5) * 56,
    y: 14 + b * 28,
    rotate: rotate === 0 ? 8 : rotate,
  };
}
