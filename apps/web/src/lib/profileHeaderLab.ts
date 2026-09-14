import { makeTitleId, type TitleSummary } from "@cinima/shared";

export { pickRecommendWash } from "./profileHeader";

/**
 * Profile header layouts, switchable from Cue lab.
 * Question: which layout makes Identicon, Handle, stats, and Share / X obvious
 * without crowding Recommends?
 *
 * Throwaway. Do not fold into Me / Public Profile / other Handles until one wins.
 */
export const PROFILE_HEADER_VARIANTS = [
  { id: "solid", label: "Solid card", short: "Solid" },
  { id: "fade", label: "Fade into Recommends", short: "Fade" },
  { id: "bleed", label: "Bleed, no card", short: "Bleed" },
  { id: "strip", label: "Stats strip", short: "Strip" },
  { id: "cover", label: "Poster cover", short: "Cover" },
  { id: "banner-bleed", label: "Cover + bleed", short: "Combo" },
] as const;

export type ProfileHeaderVariantId =
  (typeof PROFILE_HEADER_VARIANTS)[number]["id"];

export type ProfileHeaderLabPerson = {
  walletAddress: string;
  handle: string;
  xHandle: string;
  followerCount: number;
  followingCount: number;
  achievementCount: number;
};

export type ProfileHeaderLabFixture = ProfileHeaderLabPerson & {
  favorites: TitleSummary[];
  recommends: TitleSummary[];
};

const VARIANT_IDS: readonly ProfileHeaderVariantId[] = PROFILE_HEADER_VARIANTS.map(
  (row) => row.id
);

export function isProfileHeaderVariantId(
  value: string
): value is ProfileHeaderVariantId {
  return (VARIANT_IDS as readonly string[]).includes(value);
}

export function profileHeaderVariantShort(id: ProfileHeaderVariantId): string {
  return PROFILE_HEADER_VARIANTS.find((row) => row.id === id)?.short ?? id;
}

export function profileHeaderVariantIndex(id: ProfileHeaderVariantId): number {
  return VARIANT_IDS.indexOf(id);
}

export function nextProfileHeaderVariant(
  id: ProfileHeaderVariantId
): ProfileHeaderVariantId {
  const i = profileHeaderVariantIndex(id);
  return VARIANT_IDS[(i + 1) % VARIANT_IDS.length]!;
}

export function prevProfileHeaderVariant(
  id: ProfileHeaderVariantId
): ProfileHeaderVariantId {
  const i = profileHeaderVariantIndex(id);
  return VARIANT_IDS[(i - 1 + VARIANT_IDS.length) % VARIANT_IDS.length]!;
}

function title(opts: {
  mediaType: "movie" | "tv";
  tmdbId: number;
  name: string;
  year: number;
  posterPath: string;
  recommended?: boolean;
}): TitleSummary {
  return {
    id: makeTitleId(opts.mediaType, opts.tmdbId),
    mediaType: opts.mediaType,
    kind: opts.mediaType,
    tmdbId: opts.tmdbId,
    title: opts.name,
    year: opts.year,
    posterUrl: `https://image.tmdb.org/t/p/w342${opts.posterPath}`,
    overview: null,
    rating: null,
    popularity: null,
    imdbId: null,
    recommended: opts.recommended,
  };
}

/** Local Cue lab fixture. Does not load Me or mutate the signed-in Handle. */
export function cueLabProfileHeaderFixture(): ProfileHeaderLabFixture {
  const movieRecommends = [
    title({
      mediaType: "movie",
      tmdbId: 550,
      name: "Fight Club",
      year: 1999,
      posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      recommended: true,
    }),
    title({
      mediaType: "movie",
      tmdbId: 27205,
      name: "Inception",
      year: 2010,
      posterPath: "/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
      recommended: true,
    }),
    title({
      mediaType: "movie",
      tmdbId: 155,
      name: "The Dark Knight",
      year: 2008,
      posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      recommended: true,
    }),
    title({
      mediaType: "movie",
      tmdbId: 157336,
      name: "Interstellar",
      year: 2014,
      posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      recommended: true,
    }),
    title({
      mediaType: "movie",
      tmdbId: 496243,
      name: "Parasite",
      year: 2019,
      posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
      recommended: true,
    }),
    title({
      mediaType: "movie",
      tmdbId: 680,
      name: "Pulp Fiction",
      year: 1994,
      posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      recommended: true,
    }),
  ];
  const tvRecommends = [
    title({
      mediaType: "tv",
      tmdbId: 1396,
      name: "Breaking Bad",
      year: 2008,
      posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      recommended: true,
    }),
    title({
      mediaType: "tv",
      tmdbId: 100088,
      name: "The Last of Us",
      year: 2023,
      posterPath: "/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
      recommended: true,
    }),
    title({
      mediaType: "tv",
      tmdbId: 94605,
      name: "Arcane",
      year: 2021,
      posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
      recommended: true,
    }),
    title({
      mediaType: "tv",
      tmdbId: 66732,
      name: "Stranger Things",
      year: 2016,
      posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      recommended: true,
    }),
  ];
  const favoriteOnly = [
    title({
      mediaType: "movie",
      tmdbId: 238,
      name: "The Godfather",
      year: 1972,
      posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    }),
    title({
      mediaType: "movie",
      tmdbId: 13,
      name: "Forrest Gump",
      year: 1994,
      posterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    }),
    title({
      mediaType: "movie",
      tmdbId: 603,
      name: "The Matrix",
      year: 1999,
      posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    }),
    title({
      mediaType: "tv",
      tmdbId: 82856,
      name: "The Mandalorian",
      year: 2019,
      posterPath: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
    }),
    title({
      mediaType: "tv",
      tmdbId: 97546,
      name: "Ted Lasso",
      year: 2020,
      posterPath: "/uRHsiw1wLxPHFXkkv4Ix1s0O6f4.jpg",
    }),
  ];
  const recommends = [...movieRecommends, ...tvRecommends];
  return {
    walletAddress: "NQ01PEERAAAAOVERLAPDEMOWALLET00001",
    handle: "cinephile",
    xHandle: "cinephile",
    followerCount: 24,
    followingCount: 18,
    achievementCount: 6,
    recommends,
    favorites: [...recommends, ...favoriteOnly],
  };
}
