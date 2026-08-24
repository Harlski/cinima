import { tmdbPosterSrc, type LandingPoster } from "./landingPosters";
import type { FlatTopHexCell, Point } from "./flatTopHexGrid";

export type HeaderPoster = LandingPoster & { src: string };

/**
 * Curated TMDB poster_path list for the X header lab/composer.
 * Every path below has been checked against image.tmdb.org/t/p/w185 (HTTP 200).
 * Stale seed paths (e.g. old Inception) are intentionally omitted.
 */
const HEADER_POSTER_PATHS: readonly { posterPath: string; label: string }[] = [
  // Landing / recent
  { posterPath: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg", label: "Spider-Man: No Way Home" },
  { posterPath: "/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg", label: "Dune" },
  { posterPath: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg", label: "Avatar: The Way of Water" },
  { posterPath: "/74xTEgt7R36Fpooo50r9T25onhq.jpg", label: "The Batman" },
  { posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", label: "Oppenheimer" },
  { posterPath: "/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg", label: "Top Gun: Maverick" },
  { posterPath: "/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg", label: "Squid Game" },
  { posterPath: "/4ptpmWBVD9HY9hMh8Cbs6SMiy7p.jpg", label: "Silicon Valley" },
  { posterPath: "/6keUrgntgKt299a39UJCDYldb8b.jpg", label: "The Capture" },
  { posterPath: "/uRHsiw1wLxPHFXkkv4Ix1s0O6f4.jpg", label: "Ted Lasso" },
  { posterPath: "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg", label: "Wednesday" },
  { posterPath: "/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg", label: "The Last of Us" },
  { posterPath: "/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg", label: "House of the Dragon" },
  { posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", label: "Arcane" },
  // Classics / catalog
  { posterPath: "/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg", label: "Inception" },
  { posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", label: "The Dark Knight" },
  { posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", label: "Pulp Fiction" },
  { posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", label: "Parasite" },
  { posterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", label: "Forrest Gump" },
  { posterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", label: "The Shawshank Redemption" },
  { posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", label: "The Godfather" },
  { posterPath: "/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg", label: "The Godfather Part II" },
  { posterPath: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg", label: "12 Angry Men" },
  { posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", label: "Fight Club" },
  { posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", label: "Interstellar" },
  { posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", label: "Dune: Part Two" },
  { posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg", label: "Breaking Bad" },
  { posterPath: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", label: "Game of Thrones" },
  { posterPath: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg", label: "The Mandalorian" },
  { posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", label: "Stranger Things" },
  { posterPath: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg", label: "House of the Dragon (alt)" },
  // Extra verified uniqueness pool
  { posterPath: "/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg", label: "Eternal Sunshine" },
  { posterPath: "/pFlaoHTZeyNkG83vxsAJiGzfSsa.jpg", label: "Shazam! Fury of the Gods" },
  { posterPath: "/62HCnUTziyWcpDaBO2i1DX17ljH.jpg", label: "The Batman (alt)" },
  { posterPath: "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg", label: "Titanic" },
  { posterPath: "/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg", label: "Harry Potter" },
  { posterPath: "/aKx1ARwG55zZ0GpRvU2WrGrCG9o.jpg", label: "Mad Max: Fury Road" },
  { posterPath: "/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg", label: "Joker" },
  { posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", label: "The Matrix" },
  { posterPath: "/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg", label: "Spider-Man: Into the Spider-Verse" },
  { posterPath: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg", label: "Avengers: Infinity War" },
  { posterPath: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", label: "Joker (alt)" },
  { posterPath: "/xnopI5Xtky18MPhK40cZAGAOVeV.jpg", label: "Deadpool" },
  { posterPath: "/2CAL2433ZeIihfX1Hb2139CX0pW.jpg", label: "The Godfather (alt)" },
  { posterPath: "/1E5baAaEse26fej7uHcjOgEE2t2.jpg", label: "The Suicide Squad" },
  { posterPath: "/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg", label: "Dune (alt)" },
];

const byPath = new Map<string, HeaderPoster>();
for (const [i, entry] of HEADER_POSTER_PATHS.entries()) {
  if (byPath.has(entry.posterPath)) continue;
  byPath.set(entry.posterPath, {
    id: `h${String(i + 1).padStart(2, "0")}`,
    posterPath: entry.posterPath,
    alt: entry.label,
    src: tmdbPosterSrc(entry.posterPath),
  });
}

export const headerPosters: readonly HeaderPoster[] = Array.from(byPath.values());

/** Dev-lab poster URL via Vite proxy (avoids TMDB CORS on Save PNG). */
export function labTmdbPosterSrc(posterPath: string, size = "w500"): string {
  const path = posterPath.startsWith("/") ? posterPath : `/${posterPath}`;
  return `/tmdb-img/${size}${path}`;
}

/** Flat-top hex AABB vs banner bounds (includes partially clipped edge tiles). */
export function hexIntersectsBounds(
  center: Point,
  radius: number,
  bounds: { width: number; height: number }
): boolean {
  const halfW = radius;
  const halfH = (Math.sqrt(3) / 2) * radius;
  return !(
    center.x + halfW < 0 ||
    center.x - halfW > bounds.width ||
    center.y + halfH < 0 ||
    center.y - halfH > bounds.height
  );
}

/**
 * Assign posters 1:1 with no duplicates for tiles that intersect the banner.
 * Extra off-screen tiles get leftover unique posters, then null (stroke only).
 */
export function assignUniqueHeaderPosters(
  cells: readonly FlatTopHexCell[],
  radius: number,
  bounds: { width: number; height: number }
): (HeaderPoster | null)[] {
  const pool = [...headerPosters];
  const assigned: (HeaderPoster | null)[] = Array.from(
    { length: cells.length },
    () => null
  );

  const ranked = cells
    .map((cell, index) => ({
      cell,
      index,
      visible: hexIntersectsBounds(cell.center, radius, bounds),
    }))
    .sort((a, b) => {
      if (a.visible !== b.visible) return a.visible ? -1 : 1;
      if (a.cell.row !== b.cell.row) return a.cell.row - b.cell.row;
      return a.cell.col - b.cell.col;
    });

  let cursor = 0;
  for (const item of ranked) {
    if (!item.visible) continue;
    if (cursor >= pool.length) break;
    assigned[item.index] = pool[cursor++]!;
  }
  for (const item of ranked) {
    if (item.visible) continue;
    if (cursor >= pool.length) break;
    assigned[item.index] = pool[cursor++]!;
  }
  return assigned;
}
