import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-tv-eps-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.TMDB_API_KEY = "test-tmdb-key";

const WALLET = "NQ05TVEPISODEFRESHWALLET00000000001";
const TOKEN = "test-session-token-tv-eps-fresh";
const TITLE_ID = "tmdb:tv:1396";
const TMDB_ID = 1396;

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function mockTmdbFetch(input: RequestInfo | URL): Promise<Response> {
  const pathname = new URL(String(input)).pathname;
  if (pathname === `/3/tv/${TMDB_ID}`) {
    return Promise.resolve(
      jsonResponse({
        id: TMDB_ID,
        name: "Breaking Bad",
        first_air_date: "2008-01-20",
        poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        overview: "A chemistry teacher…",
        vote_average: 8.9,
        popularity: 100,
        number_of_seasons: 1,
      })
    );
  }
  if (pathname === `/3/tv/${TMDB_ID}/external_ids`) {
    return Promise.resolve(jsonResponse({ imdb_id: "tt0903747" }));
  }
  if (pathname === `/3/tv/${TMDB_ID}/season/1`) {
    return Promise.resolve(
      jsonResponse({
        episodes: [
          {
            episode_number: 1,
            name: "Pilot",
            overview: "Walter White begins cooking.",
            vote_average: 8.2,
          },
        ],
      })
    );
  }
  if (pathname === `/3/tv/${TMDB_ID}/season/1/episode/1/external_ids`) {
    return Promise.resolve(jsonResponse({ imdb_id: "tt0959621" }));
  }
  return Promise.resolve(new Response("not found", { status: 404 }));
}

describe("TV title detail with a fresh catalog row and no episodes", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();

    await db.insert(schema.users).values({
      walletAddress: WALLET,
      handle: "viewer",
      lifetimeUnlockedAt: null,
      createdAt: now,
    });
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    await db.insert(schema.titles).values({
      id: TITLE_ID,
      mediaType: "tv",
      tmdbId: TMDB_ID,
      title: "Breaking Bad",
      year: 2008,
      posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      overview: "A chemistry teacher…",
      imdbId: null,
      rating: "8.9",
      popularity: 100,
      fetchedAt: now,
      source: "tmdb",
    });

    app = (await import("../src/app.js")).app;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns season data even though the title row is not stale", async () => {
    vi.stubGlobal("fetch", mockTmdbFetch);

    const res = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}`, { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      episodes: { season: number; episode: number; name: string | null }[];
    };
    expect(body.episodes).toEqual([
      expect.objectContaining({ season: 1, episode: 1, name: "Pilot" }),
    ]);
  });
});
