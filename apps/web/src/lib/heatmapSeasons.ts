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
