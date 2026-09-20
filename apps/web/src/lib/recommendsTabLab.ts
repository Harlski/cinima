import { makeTitleId, type MediaType, type TitleSummary } from "@cinima/shared";

/**
 * Recommends tab layouts, switchable from Cue lab.
 * Question: which layout makes community Recommends feel like taste, not a dump?
 *
 * Throwaway. Do not fold into Discover until one wins.
 */
export const RECOMMENDS_TAB_VARIANTS = [
  { id: "billboard", label: "Billboard hero", short: "Billboard" },
  { id: "chart", label: "Ranked chart", short: "Chart" },
  { id: "mosaic", label: "Poster mosaic", short: "Mosaic" },
  { id: "peers", label: "Who recommended", short: "Peers" },
] as const;

export type RecommendsTabVariantId =
  (typeof RECOMMENDS_TAB_VARIANTS)[number]["id"];

export type RecommendsTabLabPeer = {
  walletAddress: string;
  handle: string;
};

export type CommunityRecommendRow = {
  title: TitleSummary;
  recommendCount: number;
  recommenders: RecommendsTabLabPeer[];
};

export type RecommendsTabLabFixture = {
  movies: CommunityRecommendRow[];
  tv: CommunityRecommendRow[];
};

export type MosaicMediaFilter = MediaType | "all";

const VARIANT_IDS: readonly RecommendsTabVariantId[] = RECOMMENDS_TAB_VARIANTS.map(
  (row) => row.id
);

export function isRecommendsTabVariantId(
  value: string
): value is RecommendsTabVariantId {
  return (VARIANT_IDS as readonly string[]).includes(value);
}

export function recommendsTabVariantShort(id: RecommendsTabVariantId): string {
  return RECOMMENDS_TAB_VARIANTS.find((row) => row.id === id)?.short ?? id;
}

export function recommendsTabVariantIndex(id: RecommendsTabVariantId): number {
  return VARIANT_IDS.indexOf(id);
}

export function nextRecommendsTabVariant(
  id: RecommendsTabVariantId
): RecommendsTabVariantId {
  const i = recommendsTabVariantIndex(id);
  return VARIANT_IDS[(i + 1) % VARIANT_IDS.length]!;
}

export function prevRecommendsTabVariant(
  id: RecommendsTabVariantId
): RecommendsTabVariantId {
  const i = recommendsTabVariantIndex(id);
  return VARIANT_IDS[(i - 1 + VARIANT_IDS.length) % VARIANT_IDS.length]!;
}

export function recommendCountLabel(count: number): string {
  return count === 1 ? "1 Recommend" : `${count} Recommends`;
}

export function featuredCommunityRecommend(
  fixture: RecommendsTabLabFixture
): CommunityRecommendRow {
  return mosaicCommunityRecommends(fixture, "all")[0]!;
}

export function rankedCommunityRecommends(
  rows: readonly CommunityRecommendRow[]
): CommunityRecommendRow[] {
  return [...rows].sort(compareCommunityRecommend);
}

export function mosaicCommunityRecommends(
  fixture: RecommendsTabLabFixture,
  filter: MosaicMediaFilter
): CommunityRecommendRow[] {
  const rows =
    filter === "movie"
      ? fixture.movies
      : filter === "tv"
        ? fixture.tv
        : [...fixture.movies, ...fixture.tv];
  return rankedCommunityRecommends(rows);
}

export function visibleRecommenders(
  recommenders: readonly RecommendsTabLabPeer[],
  cap: number
): { shown: RecommendsTabLabPeer[]; extra: number } {
  const shown = recommenders.slice(0, cap);
  return { shown: [...shown], extra: Math.max(0, recommenders.length - cap) };
}

function compareCommunityRecommend(
  a: CommunityRecommendRow,
  b: CommunityRecommendRow
): number {
  if (a.recommendCount !== b.recommendCount) {
    return b.recommendCount - a.recommendCount;
  }
  const aMovie = a.title.mediaType === "movie" ? 0 : 1;
  const bMovie = b.title.mediaType === "movie" ? 0 : 1;
  return aMovie - bMovie;
}

function title(opts: {
  mediaType: MediaType;
  tmdbId: number;
  name: string;
  year: number;
  posterPath: string;
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
    recommended: true,
  };
}

const PEERS: readonly RecommendsTabLabPeer[] = [
  { walletAddress: "NQ05DEMOCINIMACYCLETWOWALLET0000001", handle: "demouser" },
  { walletAddress: "NQ01PEERAAAAOVERLAPDEMOWALLET00001", handle: "cinephile" },
  { walletAddress: "NQ02PEERBBBBTOASTEOVERLAPWALLET02", handle: "nightowl" },
  { walletAddress: "NQ05DEMONIMCHARTSCYCLETWOWALLET0001", handle: "demoalice" },
  { walletAddress: "NQ63XN7E020HH0RNRD6G7QT1Y7AMH1P5H84B", handle: "fudger" },
  { walletAddress: "NQ05THANKSTESTWALLETPEERAA000001", handle: "ada" },
  { walletAddress: "NQ05THANKSTESTWALLETPEERBB000001", handle: "nic" },
  { walletAddress: "NQ05THANKSTESTWALLETME00000000001", handle: "meuser" },
];

function row(
  opts: {
    mediaType: MediaType;
    tmdbId: number;
    name: string;
    year: number;
    posterPath: string;
  },
  count: number
): CommunityRecommendRow {
  const recommenders = PEERS.slice(0, count).map((peer) => ({ ...peer }));
  return {
    title: title(opts),
    recommendCount: count,
    recommenders,
  };
}

/** Local Cue lab fixture. Does not load community Recommends or mutate the Handle. */
export function cueLabRecommendsTabFixture(): RecommendsTabLabFixture {
  return {
    movies: [
      row(
        {
          mediaType: "movie",
          tmdbId: 550,
          name: "Fight Club",
          year: 1999,
          posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        },
        8
      ),
      row(
        {
          mediaType: "movie",
          tmdbId: 27205,
          name: "Inception",
          year: 2010,
          posterPath: "/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
        },
        5
      ),
      row(
        {
          mediaType: "movie",
          tmdbId: 155,
          name: "The Dark Knight",
          year: 2008,
          posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        },
        4
      ),
      row(
        {
          mediaType: "movie",
          tmdbId: 157336,
          name: "Interstellar",
          year: 2014,
          posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        },
        3
      ),
      row(
        {
          mediaType: "movie",
          tmdbId: 496243,
          name: "Parasite",
          year: 2019,
          posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        },
        2
      ),
      row(
        {
          mediaType: "movie",
          tmdbId: 680,
          name: "Pulp Fiction",
          year: 1994,
          posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        },
        2
      ),
    ],
    tv: [
      row(
        {
          mediaType: "tv",
          tmdbId: 1396,
          name: "Breaking Bad",
          year: 2008,
          posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        },
        6
      ),
      row(
        {
          mediaType: "tv",
          tmdbId: 100088,
          name: "The Last of Us",
          year: 2023,
          posterPath: "/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
        },
        4
      ),
      row(
        {
          mediaType: "tv",
          tmdbId: 94605,
          name: "Arcane",
          year: 2021,
          posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
        },
        3
      ),
      row(
        {
          mediaType: "tv",
          tmdbId: 66732,
          name: "Stranger Things",
          year: 2016,
          posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        },
        2
      ),
      row(
        {
          mediaType: "tv",
          tmdbId: 136315,
          name: "The Bear",
          year: 2022,
          posterPath: "/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg",
        },
        2
      ),
    ],
  };
}
