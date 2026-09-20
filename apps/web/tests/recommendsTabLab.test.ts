import { describe, expect, it } from "vitest";
import {
  cueLabRecommendsTabVariant,
  cueLabOverlayIds,
} from "../src/lib/cueLab";
import {
  cueLabRecommendsTabFixture,
  featuredCommunityRecommend,
  mosaicCommunityRecommends,
  nextRecommendsTabVariant,
  prevRecommendsTabVariant,
  rankedCommunityRecommends,
  recommendCountLabel,
  RECOMMENDS_TAB_VARIANTS,
  visibleRecommenders,
} from "../src/lib/recommendsTabLab";

describe("Recommends tab Cue lab", () => {
  it("offers four unique Recommends tab layouts", () => {
    expect(RECOMMENDS_TAB_VARIANTS.map((row) => row.id)).toEqual([
      "billboard",
      "chart",
      "mosaic",
      "peers",
    ]);
    expect(cueLabRecommendsTabVariant("recommends-tab-chart")).toBe("chart");
    expect(cueLabRecommendsTabVariant("recommends-tab-peers")).toBe("peers");
    expect(cueLabRecommendsTabVariant("profile-header-fade")).toBe(null);
    expect(nextRecommendsTabVariant("peers")).toBe("billboard");
    expect(prevRecommendsTabVariant("billboard")).toBe("peers");
  });

  it("lists Recommends tab layouts in Cue lab overlays", () => {
    expect(cueLabOverlayIds()).toEqual(
      expect.arrayContaining([
        "recommends-tab-billboard",
        "recommends-tab-chart",
        "recommends-tab-mosaic",
        "recommends-tab-peers",
      ])
    );
  });

  it("previews community Recommends with counts and recommenders", () => {
    const fixture = cueLabRecommendsTabFixture();
    expect(fixture.movies.map((t) => t.title.title)).toEqual([
      "Fight Club",
      "Inception",
      "The Dark Knight",
      "Interstellar",
      "Parasite",
      "Pulp Fiction",
    ]);
    expect(fixture.tv.map((t) => t.title.title)).toEqual([
      "Breaking Bad",
      "The Last of Us",
      "Arcane",
      "Stranger Things",
      "The Bear",
    ]);
    expect(fixture.movies[0]).toEqual(
      expect.objectContaining({
        recommendCount: 8,
      })
    );
    expect(fixture.movies[0]?.recommenders).toHaveLength(8);
    expect(fixture.movies[0]?.recommenders[0]).toEqual({
      walletAddress: "NQ05DEMOCINIMACYCLETWOWALLET0000001",
      handle: "demouser",
    });
  });

  it("features the Title the most peers Recommended", () => {
    const fixture = cueLabRecommendsTabFixture();
    const featured = featuredCommunityRecommend(fixture);
    expect(featured.title.title).toBe("Fight Club");
    expect(featured.recommendCount).toBe(8);
    expect(featured.title.mediaType).toBe("movie");
  });

  it("ranks community Recommends by Recommend count", () => {
    const fixture = cueLabRecommendsTabFixture();
    expect(rankedCommunityRecommends(fixture.movies).map((row) => row.title.title)).toEqual([
      "Fight Club",
      "Inception",
      "The Dark Knight",
      "Interstellar",
      "Parasite",
      "Pulp Fiction",
    ]);
    expect(rankedCommunityRecommends(fixture.tv).map((row) => row.recommendCount)).toEqual([
      6, 4, 3, 2, 2,
    ]);
  });

  it("mixes Movies and TV in mosaic order by Recommend count", () => {
    const fixture = cueLabRecommendsTabFixture();
    expect(mosaicCommunityRecommends(fixture, "all").map((row) => row.title.title)).toEqual([
      "Fight Club",
      "Breaking Bad",
      "Inception",
      "The Dark Knight",
      "The Last of Us",
      "Interstellar",
      "Arcane",
      "Parasite",
      "Pulp Fiction",
      "Stranger Things",
      "The Bear",
    ]);
    expect(
      mosaicCommunityRecommends(fixture, "tv").every((row) => row.title.mediaType === "tv")
    ).toBe(true);
    expect(mosaicCommunityRecommends(fixture, "movie")[0]?.title.title).toBe("Fight Club");
  });

  it("names Recommend counts in domain language", () => {
    expect(recommendCountLabel(1)).toBe("1 Recommend");
    expect(recommendCountLabel(8)).toBe("8 Recommends");
  });

  it("stacks a few Identicons and keeps the rest as overflow", () => {
    const fixture = cueLabRecommendsTabFixture();
    const fightClub = fixture.movies[0]!;
    expect(visibleRecommenders(fightClub.recommenders, 4)).toEqual({
      shown: fightClub.recommenders.slice(0, 4),
      extra: 4,
    });
    expect(visibleRecommenders(fightClub.recommenders.slice(0, 3), 4)).toEqual({
      shown: fightClub.recommenders.slice(0, 3),
      extra: 0,
    });
  });
});
