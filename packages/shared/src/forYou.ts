import { FOR_YOU_PASS_MS, FOR_YOU_PREFETCH_AT, FOR_YOU_SET_SIZE } from "./constants.js";

export function isPassActive(
  passedAtMs: number,
  nowMs: number,
  ttlMs = FOR_YOU_PASS_MS
): boolean {
  return nowMs - passedAtMs < ttlMs;
}

export function remainingForYouIds(
  currentIds: readonly string[],
  excludeIds: ReadonlySet<string>
): string[] {
  return currentIds.filter((id) => !excludeIds.has(id));
}

export function removeFromForYouIds(
  currentIds: readonly string[],
  titleId: string
): string[] {
  return currentIds.filter((id) => id !== titleId);
}

export function nextForYouIds(
  remainingIds: readonly string[],
  candidateIds: readonly string[],
  size = FOR_YOU_SET_SIZE
): { ids: string[]; refilled: boolean } {
  if (remainingIds.length > 0) {
    return { ids: [...remainingIds], refilled: false };
  }
  return {
    ids: candidateIds.slice(0, Math.min(size, candidateIds.length)),
    refilled: true,
  };
}

/** Next For You set after the current remaining titles, skipping titles still on screen. */
export function upcomingForYouIds(
  remainingIds: readonly string[],
  candidateIds: readonly string[],
  size = FOR_YOU_SET_SIZE
): string[] {
  const held = new Set(remainingIds);
  return candidateIds.filter((id) => !held.has(id)).slice(0, size);
}

/** Oldest Passes first, skipping Favorites, Watchlist, and titles already on screen. */
export function recycleForYouIds(
  passedOldestFirst: readonly string[],
  skipIds: ReadonlySet<string>,
  size = FOR_YOU_SET_SIZE
): string[] {
  return passedOldestFirst.filter((id) => !skipIds.has(id)).slice(0, size);
}

export function shouldPrefetchForYou(
  remainingCount: number,
  prefetchAt = FOR_YOU_PREFETCH_AT
): boolean {
  return remainingCount > 0 && remainingCount <= prefetchAt;
}

/** Center card of a For You strip; matches how the picker opens. */
export function tourForYouTeachingIndex(count: number): number {
  if (count <= 0) return 0;
  return Math.floor((count - 1) / 2);
}

/** One remaining Title for the Guided tour Pass; the rest stay out of that refill. */
export function stageTourForYouSet(ids: readonly string[]): {
  teachingIds: string[];
  holdOutIds: string[];
} {
  if (ids.length <= 1) {
    return { teachingIds: [...ids], holdOutIds: [] };
  }
  const teachingId = ids[tourForYouTeachingIndex(ids.length)];
  if (!teachingId) return { teachingIds: [], holdOutIds: [] };
  return {
    teachingIds: [teachingId],
    holdOutIds: ids.filter((id) => id !== teachingId),
  };
}

/** Put the teaching Title back in the center after a skipped Guided tour Pass. */
export function restoreTourForYouSet(
  teachingIds: readonly string[],
  holdOutIds: readonly string[]
): string[] {
  if (!holdOutIds.length) return [...teachingIds];
  if (!teachingIds.length) return [...holdOutIds];
  const ids = [...holdOutIds];
  ids.splice(tourForYouTeachingIndex(ids.length + teachingIds.length), 0, ...teachingIds);
  return ids;
}

/** Overlap first, then popular Catalog, skipping titles already in the overlap queue. */
export function fifoForYouCandidateIds(
  overlapIds: readonly string[],
  popularIds: readonly string[]
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of [...overlapIds, ...popularIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
