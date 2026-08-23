/**
 * Landing hero marquee posters via TMDB image CDN.
 * Curated popular movies / TV released or first aired 2021–2025.
 * Images are not vendored in the repo — keep TMDB attribution on Landing.
 */
const TMDB_POSTER_CDN = "https://image.tmdb.org/t/p/w185";

export function tmdbPosterSrc(posterPath: string): string {
  const path = posterPath.startsWith("/") ? posterPath : `/${posterPath}`;
  return `${TMDB_POSTER_CDN}${path}`;
}

export type LandingPoster = {
  /** Stable id for keys; not a catalog Title id. */
  id: string;
  /** TMDB poster_path (leading slash). */
  posterPath: string;
  /** Decorative marquee; kept empty while aria-hidden. */
  alt: string;
};

/** Popular titles from roughly the last five years (paths from TMDB discover). */
const LANDING_POSTER_PATHS: readonly Omit<LandingPoster, "id">[] = [
  { posterPath: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg", alt: "" }, // Spider-Man: No Way Home (2021)
  { posterPath: "/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg", alt: "" }, // Dune (2021)
  { posterPath: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg", alt: "" }, // Avatar: The Way of Water (2022)
  { posterPath: "/74xTEgt7R36Fpooo50r9T25onhq.jpg", alt: "" }, // The Batman (2022)
  { posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", alt: "" }, // Oppenheimer (2023)
  { posterPath: "/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg", alt: "" }, // Top Gun: Maverick (2022)
  { posterPath: "/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg", alt: "" }, // Squid Game (2021)
  { posterPath: "/4ptpmWBVD9HY9hMh8Cbs6SMiy7p.jpg", alt: "" }, // Silicon Valley (2014)
  { posterPath: "/6keUrgntgKt299a39UJCDYldb8b.jpg", alt: "" }, // The Capture (2019)
  { posterPath: "/uRHsiw1wLxPHFXkkv4Ix1s0O6f4.jpg", alt: "" }, // Ted Lasso (2020)
  { posterPath: "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg", alt: "" }, // Wednesday (2022)
  { posterPath: "/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg", alt: "" }, // The Last of Us (2023)
  { posterPath: "/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg", alt: "" }, // House of the Dragon (2022)
  { posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", alt: "" }, // Arcane (2021)
];

export const landingPosters: readonly (LandingPoster & { src: string })[] =
  LANDING_POSTER_PATHS.map((p, i) => ({
    id: `p${String(i + 1).padStart(2, "0")}`,
    posterPath: p.posterPath,
    alt: p.alt,
    src: tmdbPosterSrc(p.posterPath),
  }));
