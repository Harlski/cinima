import { makeTitleId } from "@nimcharts/shared";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../db/schema.js";

export async function seedTitles(db: LibSQLDatabase<typeof schema>) {
  const now = new Date();

  const seedData = [
    {
      id: makeTitleId("movie", 550),
      mediaType: "movie" as const,
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
      imdbId: "tt0137523",
      imdbRating: "8.8",
      tmdbRating: "8.4",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("movie", 157336),
      mediaType: "movie" as const,
      tmdbId: 157336,
      title: "Interstellar",
      year: 2014,
      posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
      imdbId: "tt0816692",
      imdbRating: "8.6",
      tmdbRating: "8.4",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("movie", 13),
      mediaType: "movie" as const,
      tmdbId: 13,
      title: "Forrest Gump",
      year: 1994,
      posterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
      overview: "A man with a low IQ has accomplished great things in his life and been present during significant historic events.",
      imdbId: "tt0109830",
      imdbRating: "8.8",
      tmdbRating: "8.5",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("movie", 278),
      mediaType: "movie" as const,
      tmdbId: 278,
      title: "The Shawshank Redemption",
      year: 1994,
      posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
      overview: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
      imdbId: "tt0111161",
      imdbRating: "9.3",
      tmdbRating: "8.7",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("movie", 238),
      mediaType: "movie" as const,
      tmdbId: 238,
      title: "The Godfather",
      year: 1972,
      posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
      overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
      imdbId: "tt0068646",
      imdbRating: "9.2",
      tmdbRating: "8.7",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("movie", 240),
      mediaType: "movie" as const,
      tmdbId: 240,
      title: "The Godfather Part II",
      year: 1974,
      posterPath: "/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg",
      overview: "The early life and career of Vito Corleone in 1920s New York City is portrayed, while his son, Michael, expands and tightens his grip on the family crime syndicate.",
      imdbId: "tt0071562",
      imdbRating: "9.0",
      tmdbRating: "8.6",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("movie", 389),
      mediaType: "movie" as const,
      tmdbId: 389,
      title: "12 Angry Men",
      year: 1957,
      posterPath: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
      overview: "The jury in a New York City murder trial is frustrated by a single member whose skeptical caution forces them to more carefully consider the evidence.",
      imdbId: "tt0050083",
      imdbRating: "9.0",
      tmdbRating: "8.5",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("tv", 1396),
      mediaType: "tv" as const,
      tmdbId: 1396,
      title: "Breaking Bad",
      year: 2008,
      posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      overview: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
      imdbId: "tt0903747",
      imdbRating: "9.5",
      tmdbRating: "8.9",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("tv", 1399),
      mediaType: "tv" as const,
      tmdbId: 1399,
      title: "Game of Thrones",
      year: 2011,
      posterPath: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
      overview: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
      imdbId: "tt0944947",
      imdbRating: "9.2",
      tmdbRating: "8.4",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("tv", 60625),
      mediaType: "tv" as const,
      tmdbId: 60625,
      title: "The Mandalorian",
      year: 2019,
      posterPath: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
      overview: "After the fall of the Empire, a lone gunfighter makes his way through the outer reaches of the lawless galaxy.",
      imdbId: "tt8111088",
      imdbRating: "8.7",
      tmdbRating: "8.5",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("tv", 82856),
      mediaType: "tv" as const,
      tmdbId: 82856,
      title: "The Mandalorian",
      year: 2019,
      posterPath: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
      overview: "After the fall of the Empire, a lone gunfighter makes his way through the outer reaches of the lawless galaxy.",
      imdbId: "tt8111088",
      imdbRating: "8.7",
      tmdbRating: "8.5",
      fetchedAt: now,
      source: "seed",
    },
    {
      id: makeTitleId("tv", 94605),
      mediaType: "tv" as const,
      tmdbId: 94605,
      title: "Arcane",
      year: 2021,
      posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
      overview: "Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.",
      imdbId: "tt11126994",
      imdbRating: "9.0",
      tmdbRating: "8.8",
      fetchedAt: now,
      source: "seed",
    },
  ];

  for (const title of seedData) {
    try {
      await db.insert(schema.titles).values(title);
    } catch (e: any) {
      if (!e.message?.includes("UNIQUE")) {
        throw e;
      }
    }
  }

  const tvShows = [
    { titleId: makeTitleId("tv", 1396), seasons: 5, episodesPerSeason: [7, 13, 13, 13, 16] },
    { titleId: makeTitleId("tv", 1399), seasons: 8, episodesPerSeason: [10, 10, 10, 10, 10, 10, 7, 6] },
    { titleId: makeTitleId("tv", 60625), seasons: 3, episodesPerSeason: [8, 8, 8] },
    { titleId: makeTitleId("tv", 94605), seasons: 2, episodesPerSeason: [9, 9] },
  ];

  for (const show of tvShows) {
    for (let season = 1; season <= show.seasons; season++) {
      const episodeCount = show.episodesPerSeason[season - 1] || 10;
      for (let episode = 1; episode <= episodeCount; episode++) {
        const rating = (7.5 + Math.random() * 2).toFixed(1);
        try {
          await db.insert(schema.episodes).values({
            titleId: show.titleId,
            season,
            episode,
            name: `Episode ${episode}`,
            imdbRating: rating,
            fetchedAt: now,
          });
        } catch (e: any) {
          if (!e.message?.includes("UNIQUE")) {
            throw e;
          }
        }
      }
    }
  }

  console.log(`Seeded ${seedData.length} titles and episodes for ${tvShows.length} TV shows`);
}
