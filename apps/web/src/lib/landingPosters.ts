/**
 * Landing hero marquee posters.
 * Served as static files from /landing/posters (Vercel CDN).
 * Swap these paths when real non-TMDB art is ready — keep 2:3 WebP ~180×270.
 */
export type LandingPoster = {
  /** Stable id for keys; not a catalog Title id. */
  id: string;
  src: string;
  /** Empty while placeholders; optional alt once real art lands. */
  alt: string;
};

export const landingPosters: readonly LandingPoster[] = [
  { id: "p01", src: "/landing/posters/poster-01.webp", alt: "" },
  { id: "p02", src: "/landing/posters/poster-02.webp", alt: "" },
  { id: "p03", src: "/landing/posters/poster-03.webp", alt: "" },
  { id: "p04", src: "/landing/posters/poster-04.webp", alt: "" },
  { id: "p05", src: "/landing/posters/poster-05.webp", alt: "" },
  { id: "p06", src: "/landing/posters/poster-06.webp", alt: "" },
  { id: "p07", src: "/landing/posters/poster-07.webp", alt: "" },
  { id: "p08", src: "/landing/posters/poster-08.webp", alt: "" },
  { id: "p09", src: "/landing/posters/poster-09.webp", alt: "" },
  { id: "p10", src: "/landing/posters/poster-10.webp", alt: "" },
  { id: "p11", src: "/landing/posters/poster-11.webp", alt: "" },
  { id: "p12", src: "/landing/posters/poster-12.webp", alt: "" },
  { id: "p13", src: "/landing/posters/poster-13.webp", alt: "" },
  { id: "p14", src: "/landing/posters/poster-14.webp", alt: "" },
];
