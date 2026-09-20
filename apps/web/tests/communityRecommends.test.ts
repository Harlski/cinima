import { describe, expect, it } from "vitest";
import { makeTitleId } from "@cinima/shared";
import {
  mosaicCommunityRecommends,
  recommendCountLabel,
} from "../src/lib/communityRecommends";

function item(
  name: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
  recommendCount: number
) {
  return {
    recommendCount,
    title: {
      id: makeTitleId(mediaType, tmdbId),
      mediaType,
      tmdbId,
      title: name,
      year: 2000,
      posterUrl: null,
      overview: null,
      rating: null,
      popularity: null,
      imdbId: null,
      recommendCount,
    },
  };
}

describe("Community Recommends mosaic", () => {
  it("orders All by Recommend count, Movies before TV on a tie", () => {
    const movies = [
      item("Inception", "movie", 27205, 5),
      item("Fight Club", "movie", 550, 8),
    ];
    const tv = [item("Breaking Bad", "tv", 1396, 5)];
    expect(
      mosaicCommunityRecommends(movies, tv, "all").map((row) => row.title.title)
    ).toEqual(["Fight Club", "Inception", "Breaking Bad"]);
    expect(
      mosaicCommunityRecommends(movies, tv, "tv").map((row) => row.title.title)
    ).toEqual(["Breaking Bad"]);
    expect(mosaicCommunityRecommends(movies, [], "tv")).toEqual([]);
  });

  it("names Recommend counts in domain language", () => {
    expect(recommendCountLabel(1)).toBe("1 Recommend");
    expect(recommendCountLabel(8)).toBe("8 Recommends");
  });
});
