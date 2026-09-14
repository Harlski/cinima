import type { TitleSummary } from "@cinima/shared";

export const PROFILE_HEADER_WASH_COUNT = 4;

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = items[i]!;
    items[i] = items[j]!;
    items[j] = a;
  }
  return items;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Banner posters from Recommends only: shuffled, movie and TV mixed when both exist.
 * Favorite-only titles stay out of the wash.
 */
export function pickRecommendWash(
  recommends: readonly TitleSummary[],
  count = PROFILE_HEADER_WASH_COUNT,
  random: () => number = Math.random
): TitleSummary[] {
  const withPosters = recommends.filter((t) => t.posterUrl);
  const movies = shuffleInPlace(
    withPosters.filter((t) => t.mediaType === "movie"),
    random
  );
  const tv = shuffleInPlace(
    withPosters.filter((t) => t.mediaType === "tv"),
    random
  );
  const picked: TitleSummary[] = [];
  const tvFirst = random() < 0.5;
  let mi = 0;
  let ti = 0;
  while (picked.length < count && (mi < movies.length || ti < tv.length)) {
    const wantTv = tvFirst ? picked.length % 2 === 0 : picked.length % 2 === 1;
    if (wantTv && ti < tv.length) picked.push(tv[ti++]!);
    else if (!wantTv && mi < movies.length) picked.push(movies[mi++]!);
    else if (ti < tv.length) picked.push(tv[ti++]!);
    else if (mi < movies.length) picked.push(movies[mi++]!);
    else break;
  }
  return picked;
}

/** Stable mix for a Handle: same Recommends keep the same banner. */
export function pickRecommendWashForProfile(
  walletAddress: string,
  recommends: readonly TitleSummary[],
  count = PROFILE_HEADER_WASH_COUNT
): TitleSummary[] {
  const ids = recommends.map((t) => t.id).join(",");
  return pickRecommendWash(
    recommends,
    count,
    mulberry32(hashString(`${walletAddress}:${ids}`))
  );
}
