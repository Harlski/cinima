import { makeTitleId } from "@nimcharts/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { episodes, titles } from "../db/schema.js";

type SeedTitle = {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  overview: string;
  imdbRating: string;
  tmdbRating: string;
  imdbId?: string;
  episodeGrid?: { seasons: number; episodesPerSeason: number; ratings: (number | null)[][] };
};

const SEEDS: SeedTitle[] = [
  {
    mediaType: "movie",
    tmdbId: 27205,
    title: "Inception",
    year: 2010,
    posterPath: "/oYuLEt3zBJxUQIF7ZoVAEjdUcDN.jpg",
    overview: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
    imdbRating: "8.8",
    tmdbRating: "8.4",
    imdbId: "tt1375666",
  },
  {
    mediaType: "movie",
    tmdbId: 157336,
    title: "Interstellar",
    year: 2014,
    posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    imdbRating: "8.7",
    tmdbRating: "8.5",
    imdbId: "tt0816692",
  },
  {
    mediaType: "movie",
    tmdbId: 155,
    title: "The Dark Knight",
    year: 2008,
    posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.",
    imdbRating: "9.0",
    tmdbRating: "8.5",
    imdbId: "tt0468569",
  },
  {
    mediaType: "movie",
    tmdbId: 680,
    title: "Pulp Fiction",
    year: 1994,
    posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    overview: "The lives of two mob hitmen, a boxer, a gangster's wife, and a pair of diner bandits intertwine.",
    imdbRating: "8.9",
    tmdbRating: "8.5",
    imdbId: "tt0110912",
  },
  {
    mediaType: "movie",
    tmdbId: 496243,
    title: "Parasite",
    year: 2019,
    posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    overview: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    imdbRating: "8.5",
    tmdbRating: "8.5",
    imdbId: "tt6751668",
  },
  {
    mediaType: "movie",
    tmdbId: 13,
    title: "Forrest Gump",
    year: 1994,
    posterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    overview: "The presidencies of Kennedy and Johnson, Vietnam, Watergate, and other history unfold through the perspective of an Alabama man.",
    imdbRating: "8.8",
    tmdbRating: "8.5",
    imdbId: "tt0109830",
  },
  {
    mediaType: "movie",
    tmdbId: 238,
    title: "The Godfather",
    year: 1972,
    posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    imdbRating: "9.2",
    tmdbRating: "8.7",
    imdbId: "tt0068646",
  },
  {
    mediaType: "movie",
    tmdbId: 550,
    title: "Fight Club",
    year: 1999,
    posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    overview: "An office worker and a soap maker form an underground fight club that evolves into something much more.",
    imdbRating: "8.8",
    tmdbRating: "8.4",
    imdbId: "tt0137523",
  },
  {
    mediaType: "tv",
    tmdbId: 1396,
    title: "Breaking Bad",
    year: 2008,
    posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    overview: "A chemistry teacher diagnosed with cancer turns to manufacturing meth with a former student.",
    imdbRating: "9.5",
    tmdbRating: "8.9",
    imdbId: "tt0903747",
    episodeGrid: {
      seasons: 2,
      episodesPerSeason: 7,
      ratings: [
        [9.0, 8.7, 8.8, 8.3, 8.4, 9.3, 8.9],
        [8.7, 9.3, 8.4, 8.3, 8.4, 8.9, 9.2],
      ],
    },
  },
  {
    mediaType: "tv",
    tmdbId: 1399,
    title: "Game of Thrones",
    year: 2011,
    posterPath: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    overview: "Nine noble families fight for control over the lands of Westeros.",
    imdbRating: "9.2",
    tmdbRating: "8.4",
    imdbId: "tt0944947",
    episodeGrid: {
      seasons: 2,
      episodesPerSeason: 6,
      ratings: [
        [9.0, 8.8, 8.7, 8.8, null, 9.1],
        [8.8, 8.6, 8.8, 8.8, 8.9, 9.0],
      ],
    },
  },
  {
    mediaType: "tv",
    tmdbId: 66732,
    title: "Stranger Things",
    year: 2016,
    posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments.",
    imdbRating: "8.7",
    tmdbRating: "8.6",
    imdbId: "tt4574334",
    episodeGrid: {
      seasons: 2,
      episodesPerSeason: 6,
      ratings: [
        [8.5, 8.5, 8.8, 8.8, 8.9, 9.0],
        [8.2, 8.4, 8.5, 8.7, 8.4, 8.8],
      ],
    },
  },
  {
    mediaType: "tv",
    tmdbId: 94605,
    title: "Arcane",
    year: 2021,
    posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    overview: "The origins of two legendary champions — and the power that will tear them apart.",
    imdbRating: "9.0",
    tmdbRating: "8.7",
    imdbId: "tt11126994",
    episodeGrid: {
      seasons: 1,
      episodesPerSeason: 9,
      ratings: [[8.6, 8.6, 8.8, 8.7, 8.7, 9.0, 9.1, 9.5, 9.6]],
    },
  },
  {
    mediaType: "movie",
    tmdbId: 693134,
    title: "Dune: Part Two",
    year: 2024,
    posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    imdbRating: "8.5",
    tmdbRating: "8.1",
    imdbId: "tt15239678",
  },
  {
    mediaType: "movie",
    tmdbId: 872585,
    title: "Oppenheimer",
    year: 2023,
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb.",
    imdbRating: "8.3",
    tmdbRating: "8.1",
    imdbId: "tt15398776",
  },
  {
    mediaType: "tv",
    tmdbId: 94997,
    title: "House of the Dragon",
    year: 2022,
    posterPath: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
    overview: "The Targaryen civil war, set 200 years before the events of Game of Thrones.",
    imdbRating: "8.4",
    tmdbRating: "8.4",
    imdbId: "tt11198330",
    episodeGrid: {
      seasons: 1,
      episodesPerSeason: 8,
      ratings: [[8.4, 8.2, 8.2, 8.3, 8.5, 8.8, 8.8, 9.0]],
    },
  },
];

export async function seedCatalogIfEmpty() {
  const existing = await db.select({ id: titles.id }).from(titles).limit(1);
  if (existing.length > 0) return;

  const now = new Date();
  for (const s of SEEDS) {
    const id = makeTitleId(s.mediaType, s.tmdbId);
    await db.insert(titles).values({
      id,
      mediaType: s.mediaType,
      tmdbId: s.tmdbId,
      title: s.title,
      year: s.year,
      posterPath: s.posterPath,
      overview: s.overview,
      imdbId: s.imdbId ?? null,
      imdbRating: s.imdbRating,
      tmdbRating: s.tmdbRating,
      fetchedAt: now,
      source: "seed",
    });

    if (s.episodeGrid) {
      const { seasons, episodesPerSeason, ratings } = s.episodeGrid;
      for (let season = 1; season <= seasons; season++) {
        for (let ep = 1; ep <= episodesPerSeason; ep++) {
          const rating = ratings[season - 1]?.[ep - 1] ?? null;
          await db.insert(episodes).values({
            titleId: id,
            season,
            episode: ep,
            name: `S${season}E${ep}`,
            imdbRating: rating != null ? String(rating) : null,
            fetchedAt: now,
          });
        }
      }
    }
  }

  console.log(`[seed] inserted ${SEEDS.length} titles`);
}

/** Ensure a known seed exists (used in demo paths) */
export async function getSeedCount() {
  const rows = await db.select({ id: titles.id }).from(titles);
  return rows.length;
}

export async function ensureTitleRow(id: string) {
  const [row] = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
  return row ?? null;
}
