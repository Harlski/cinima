import { describe, expect, it } from "vitest";
import {
  episodeCountInSeasons,
  hideAllSeasonsTab,
  maxEpisodeInSeasons,
  useCompactEpisodeGrid,
  visibleHeatmapSeasons,
} from "../src/lib/heatmapSeasons";

describe("heatmapSeasons", () => {
  it("shows all seasons when focus is null", () => {
    expect(visibleHeatmapSeasons([1, 2, 3], null)).toEqual([1, 2, 3]);
  });

  it("focuses a single season when set", () => {
    expect(visibleHeatmapSeasons([1, 2, 3], 2)).toEqual([2]);
  });

  it("counts max episode only within visible seasons", () => {
    const eps = [
      { season: 1, episode: 10 },
      { season: 2, episode: 3 },
    ];
    expect(maxEpisodeInSeasons(eps, [2])).toBe(3);
    expect(maxEpisodeInSeasons(eps, [1, 2])).toBe(10);
  });

  it("uses a compact wrap grid for a long single season", () => {
    expect(useCompactEpisodeGrid(1, 1200)).toBe(true);
    expect(useCompactEpisodeGrid(1, 20)).toBe(false);
    expect(useCompactEpisodeGrid(3, 1200)).toBe(false);
  });

  it("hides All when a long multi-season series would overwhelm", () => {
    expect(hideAllSeasonsTab(1200, 30)).toBe(true);
    expect(hideAllSeasonsTab(12, 2)).toBe(false);
    expect(hideAllSeasonsTab(1200, 1)).toBe(false);
  });

  it("counts episodes in visible seasons", () => {
    const eps = [{ season: 1 }, { season: 1 }, { season: 2 }];
    expect(episodeCountInSeasons(eps, [1])).toBe(2);
  });
});
