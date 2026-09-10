import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-search-tmdb-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.TMDB_API_KEY = "test-tmdb-key";
process.env.TMDB_TIMEOUT_MS = "80";

const WALLET = "NQ05SEARCHTMDBWALLET0000000000001";
const TOKEN = "test-session-token-search-tmdb";
const LOCAL_ID = "tmdb:movie:7";
const APPLE_TV_ID = 99;

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function hang(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    const signal = init?.signal;
    if (!signal) return;
    if (signal.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
}

describe("Search with TMDB lists", () => {
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
      handle: "searcher",
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
      id: LOCAL_ID,
      mediaType: "movie",
      tmdbId: 7,
      title: "Local Apple Tart",
      year: 2020,
      posterPath: "/tart.jpg",
      overview: "A dessert.",
      imdbId: null,
      rating: "6.1",
      popularity: 4,
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns TMDB search list titles without waiting on title detail", async () => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/3/search/movie") {
        return Promise.resolve(jsonResponse({ results: [] }));
      }
      if (pathname === "/3/search/tv") {
        return Promise.resolve(
          jsonResponse({
            results: [
              {
                id: APPLE_TV_ID,
                name: "The Apple",
                first_air_date: "2024-01-01",
                poster_path: "/apple-tv.jpg",
                overview: "A fruit show.",
                vote_average: 7.2,
                popularity: 88,
              },
            ],
          })
        );
      }
      return hang(input, init);
    });

    const res = await app.fetch(
      new Request("http://test/api/search?q=Apple", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { id: string; title: string }[];
    };
    expect(body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "tmdb:tv:99",
          title: "The Apple",
        }),
      ])
    );
  });

  it("returns local catalog matches when TMDB search does not answer", async () => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      hang(input, init)
    );

    const res = await app.fetch(
      new Request("http://test/api/search?q=Tart", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { id: string; title: string }[];
    };
    expect(body.results).toEqual([
      expect.objectContaining({
        id: LOCAL_ID,
        title: "Local Apple Tart",
      }),
    ]);
    expect(body.tmdbTimedOut).toBe(true);
  });

  it("marks TMDB timeout with no local matches so the client can Retry", async () => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      hang(input, init)
    );

    const res = await app.fetch(
      new Request("http://test/api/search?q=zzqxvzzq", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { id: string }[];
      tmdbTimedOut: boolean;
    };
    expect(body.results).toEqual([]);
    expect(body.tmdbTimedOut).toBe(true);
  });

  it("hydrates TV episodes on title detail after a list-only search", async () => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/3/search/movie") {
        return Promise.resolve(jsonResponse({ results: [] }));
      }
      if (pathname === "/3/search/tv") {
        return Promise.resolve(
          jsonResponse({
            results: [
              {
                id: APPLE_TV_ID,
                name: "The Apple",
                first_air_date: "2024-01-01",
                poster_path: "/apple-tv.jpg",
                overview: "A fruit show.",
                vote_average: 7.2,
                popularity: 88,
              },
            ],
          })
        );
      }
      if (pathname === `/3/tv/${APPLE_TV_ID}`) {
        return Promise.resolve(
          jsonResponse({
            id: APPLE_TV_ID,
            name: "The Apple",
            first_air_date: "2024-01-01",
            poster_path: "/apple-tv.jpg",
            overview: "A fruit show.",
            vote_average: 7.2,
            popularity: 88,
            number_of_seasons: 1,
          })
        );
      }
      if (pathname === `/3/tv/${APPLE_TV_ID}/external_ids`) {
        return Promise.resolve(jsonResponse({ imdb_id: "tt0000099" }));
      }
      if (pathname === `/3/tv/${APPLE_TV_ID}/season/1`) {
        return Promise.resolve(
          jsonResponse({
            episodes: [
              {
                episode_number: 1,
                name: "Pilot",
                overview: "A fruit.",
                vote_average: 7.0,
              },
            ],
          })
        );
      }
      if (pathname === `/3/tv/${APPLE_TV_ID}/season/1/episode/1/external_ids`) {
        return Promise.resolve(jsonResponse({ imdb_id: "tt0000100" }));
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    await app.fetch(new Request("http://test/api/search?q=Apple", { headers }));
    const res = await app.fetch(
      new Request("http://test/api/titles/tmdb:tv:99", { headers })
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
