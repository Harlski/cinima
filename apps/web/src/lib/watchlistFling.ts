import { deckCenterIndex } from "./deckSelection";

/** Horizontal pan works from any strip title; a fling only from the selected slot. */
export function watchlistStripSlotGesture(
  startIndex: number,
  selectedIndex: number
): { pan: boolean; fling: boolean } {
  return {
    pan: true,
    fling: startIndex === selectedIndex,
  };
}

export const WATCHLIST_FLING_DY = 56;
export const WATCHLIST_FLING_CYCLE_STEPS = 8;
export const WATCHLIST_FLING_CYCLE_STEP_MS = 48;

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

/** After a Watchlist fling, stay on the same slot. Cards do not move. */
export function watchlistFlingDeckFocus(
  nextIds: readonly string[],
  previousSelectedIndex = deckCenterIndex(nextIds.length)
): {
  selectedIndex: number;
  selectedId: string | undefined;
} {
  const last = Math.max(0, nextIds.length - 1);
  const selectedIndex = Math.min(Math.max(0, previousSelectedIndex), last);
  return {
    selectedIndex,
    selectedId: nextIds[selectedIndex],
  };
}

export function watchlistFlingCycleFrames(input: {
  previousIds: readonly string[];
  nextIds: readonly string[];
  steps?: number;
  random?: () => number;
}): string[][] {
  const pool = input.nextIds;
  const n = pool.length;
  const steps = Math.max(2, input.steps ?? WATCHLIST_FLING_CYCLE_STEPS);
  const random = input.random ?? Math.random;
  const frames: string[][] = [];
  for (let step = 0; step < steps - 1; step++) {
    frames.push(
      Array.from({ length: n }, (_, slot) => {
        const previous = input.previousIds[slot];
        let pick =
          pool[Math.min(Math.max(Math.floor(random() * pool.length), 0), pool.length - 1)] ??
          pool[0] ??
          "";
        if (n > 1 && pick === previous) {
          const again = Math.floor(random() * pool.length);
          const next = pool[Math.min(Math.max(again, 0), pool.length - 1)];
          if (next) pick = next;
        }
        return pick;
      })
    );
  }
  frames.push([...pool]);
  return frames;
}
