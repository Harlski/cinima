/** Above this episode count, prefer season focus and compact grids. */
export const LONG_SERIES_EPISODE_THRESHOLD = 40;

/** Single-season grids above this use a wrapping layout instead of one tall column. */
export const COMPACT_SEASON_EPISODE_THRESHOLD = 36;

/** Episode heatmap: which seasons to show when focusing one season. */
export function visibleHeatmapSeasons(
  seasons: readonly number[],
  focusSeason: number | null
): number[] {
  if (focusSeason == null) return [...seasons];
  return seasons.includes(focusSeason) ? [focusSeason] : [...seasons];
}

export function maxEpisodeInSeasons(
  episodes: readonly { season: number; episode: number }[],
  seasons: readonly number[]
): number {
  const want = new Set(seasons);
  let max = 0;
  for (const ep of episodes) {
    if (!want.has(ep.season)) continue;
    if (ep.episode > max) max = ep.episode;
  }
  return max;
}

export function episodeCountInSeasons(
  episodes: readonly { season: number }[],
  seasons: readonly number[]
): number {
  const want = new Set(seasons);
  let n = 0;
  for (const ep of episodes) {
    if (want.has(ep.season)) n += 1;
  }
  return n;
}

/** Wrap cells when one season (or focused season) is too tall as a column. */
export function useCompactEpisodeGrid(
  visibleSeasonCount: number,
  episodeCount: number
): boolean {
  return visibleSeasonCount === 1 && episodeCount > COMPACT_SEASON_EPISODE_THRESHOLD;
}

/** Hide "All seasons" when the full matrix would be unwieldy. */
export function hideAllSeasonsTab(
  totalEpisodes: number,
  seasonCount: number
): boolean {
  return totalEpisodes > LONG_SERIES_EPISODE_THRESHOLD && seasonCount > 1;
}
