import { describe, expect, it } from "vitest";
import type { TitleSummary } from "@cinima/shared";
import { favoriteOnlyTitles } from "../src/lib/profileTaste";

function title(
  id: string,
  opts: { recommended?: boolean; mediaType?: TitleSummary["mediaType"] } = {}
): TitleSummary {
  return {
    id,
    mediaType: opts.mediaType ?? "movie",
    tmdbId: 1,
    title: id,
    year: 2020,
    posterUrl: null,
    overview: null,
    rating: null,
    popularity: null,
    imdbId: null,
    recommended: opts.recommended,
  };
}

describe("favoriteOnlyTitles", () => {
  it("keeps Favorites that are not Recommended", () => {
    const favorites = [title("movie:1"), title("movie:2")];
    expect(favoriteOnlyTitles(favorites, [])).toEqual(favorites);
  });

  it("hides a title that is also a Recommend", () => {
    const gold = title("movie:1", { recommended: true });
    const plain = title("movie:2");
    const shown = favoriteOnlyTitles([gold, plain], [gold]);
    expect(shown.map((t) => t.id)).toEqual(["movie:2"]);
  });

  it("hides a title listed in Recommends even without the recommended flag", () => {
    const favorite = title("tv:9");
    const recommend = title("tv:9", { recommended: true, mediaType: "tv" });
    expect(favoriteOnlyTitles([favorite], [recommend])).toEqual([]);
  });

  it("hides a flagged Recommend even if it is missing from the Recommends list", () => {
    const gold = title("movie:3", { recommended: true });
    expect(favoriteOnlyTitles([gold], [])).toEqual([]);
  });

  it("preserves Favorite-only order", () => {
    const a = title("movie:a");
    const gold = title("movie:gold", { recommended: true });
    const b = title("tv:b", { mediaType: "tv" });
    const shown = favoriteOnlyTitles([a, gold, b], [gold]);
    expect(shown.map((t) => t.id)).toEqual(["movie:a", "tv:b"]);
  });
});
