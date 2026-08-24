import { describe, expect, it } from "vitest";
import {
  maxEpisodeInSeasons,
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
});
