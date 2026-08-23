import { describe, expect, it } from "vitest";
import { titleValuesFromTmdbListItem } from "../src/services/catalog.js";

describe("titleValuesFromTmdbListItem", () => {
  it("maps a movie discover row into a titles upsert shape", () => {
    const values = titleValuesFromTmdbListItem("movie", {
      id: 550,
      title: "Fight Club",
      release_date: "1999-10-15",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      overview: "An insomniac office worker…",
      vote_average: 8.4,
      popularity: 72.5,
    });

    expect(values).toMatchObject({
      id: "tmdb:movie:550",
      mediaType: "movie",
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      overview: "An insomniac office worker…",
      rating: "8.4",
      popularity: 72.5,
      source: "tmdb",
    });
  });

  it("maps a TV discover row using name and first_air_date", () => {
    const values = titleValuesFromTmdbListItem("tv", {
      id: 1396,
      name: "Breaking Bad",
      first_air_date: "2008-01-20",
      poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      overview: "A chemistry teacher…",
      vote_average: 8.9,
      popularity: 100,
    });

    expect(values).toMatchObject({
      id: "tmdb:tv:1396",
      mediaType: "tv",
      tmdbId: 1396,
      title: "Breaking Bad",
      year: 2008,
      posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      source: "tmdb",
    });
  });
});
