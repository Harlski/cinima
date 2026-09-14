import { describe, expect, it } from "vitest";
import type { TitleSummary } from "@cinima/shared";
import { cueLabProfileHeaderFixture } from "../src/lib/profileHeaderLab";
import {
  pickRecommendWash,
  pickRecommendWashForProfile,
} from "../src/lib/profileHeader";

function title(
  id: string,
  opts: { mediaType?: TitleSummary["mediaType"]; poster?: boolean } = {}
): TitleSummary {
  return {
    id,
    mediaType: opts.mediaType ?? "movie",
    tmdbId: 1,
    title: id,
    year: 2020,
    posterUrl: opts.poster === false ? null : `https://img.test/${id}.jpg`,
    overview: null,
    rating: null,
    popularity: null,
    imdbId: null,
    recommended: true,
  };
}

describe("pickRecommendWash", () => {
  it("mixes movie and TV Recommends instead of the first four movies", () => {
    const fixture = cueLabProfileHeaderFixture();
    const firstFour = fixture.recommends.slice(0, 4).map((t) => t.id);
    const wash = pickRecommendWash(fixture.recommends, 4, () => 0.99);
    expect(wash).toHaveLength(4);
    expect(new Set(wash.map((t) => t.id)).size).toBe(4);
    expect(wash.every((t) => t.posterUrl)).toBe(true);
    expect(new Set(wash.map((t) => t.mediaType))).toEqual(
      new Set(["movie", "tv"])
    );
    expect(wash.map((t) => t.id)).not.toEqual(firstFour);
  });

  it("skips Favorite-only titles and titles without posters", () => {
    const wash = pickRecommendWash(
      [
        title("movie-plain", { poster: false }),
        title("movie-a"),
        title("tv-a", { mediaType: "tv" }),
      ],
      4,
      () => 0.5
    );
    expect(wash.map((t) => t.id).sort()).toEqual(["movie-a", "tv-a"]);
  });
});

describe("pickRecommendWashForProfile", () => {
  it("keeps the same mix for the same Handle and Recommends", () => {
    const fixture = cueLabProfileHeaderFixture();
    const a = pickRecommendWashForProfile(
      fixture.walletAddress,
      fixture.recommends
    );
    const b = pickRecommendWashForProfile(
      fixture.walletAddress,
      fixture.recommends
    );
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
    expect(a).toHaveLength(4);
    expect(new Set(a.map((t) => t.mediaType))).toEqual(
      new Set(["movie", "tv"])
    );
  });
});
