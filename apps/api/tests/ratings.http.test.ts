import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-ratings-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
delete process.env.OMDB_API_KEY;

const WALLET = "NQ05RATINGSTESTWALLET00000000000001";
const TOKEN = "test-session-token-ratings";
const MOVIE_ID = "tmdb:movie:42";
const TV_ID = "tmdb:tv:99";

describe("TMDB-only ratings HTTP API", () => {
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
      handle: "rater",
      lifetimeUnlockedAt: null,
      createdAt: now,
    });
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });

    await db.insert(schema.titles).values([
      {
        id: MOVIE_ID,
        mediaType: "movie",
        tmdbId: 42,
        title: "Rated Movie",
        year: 2024,
        posterPath: null,
        overview: "fixture",
        imdbId: "tt0000042",
        rating: "8.4",
        fetchedAt: now,
        source: "seed",
      },
      {
        id: TV_ID,
        mediaType: "tv",
        tmdbId: 99,
        title: "Rated Show",
        year: 2020,
        posterPath: null,
        overview: "tv fixture",
        imdbId: null,
        rating: "8.1",
        fetchedAt: now,
        source: "seed",
      },
    ]);

    await db.insert(schema.episodes).values([
      {
        titleId: TV_ID,
        season: 1,
        episode: 1,
        name: "Pilot",
        overview: "Walter White begins cooking.",
        imdbId: "tt0959621",
        rating: "7.8",
        fetchedAt: now,
      },
      {
        titleId: TV_ID,
        season: 1,
        episode: 2,
        name: "Pilot Two",
        overview: null,
        imdbId: null,
        rating: "8.2",
        fetchedAt: now,
      },
    ]);

    app = (await import("../src/app.js")).app;
  });

  it("returns episode overview and IMDb id on title detail", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TV_ID)}`, { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      episodes: {
        season: number;
        episode: number;
        overview: string | null;
        imdbId: string | null;
      }[];
    };
    expect(body.episodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          season: 1,
          episode: 1,
          overview: "Walter White begins cooking.",
          imdbId: "tt0959621",
        }),
        expect.objectContaining({
          season: 1,
          episode: 2,
          overview: null,
          imdbId: null,
        }),
      ])
    );
  });

  it("returns TMDB-sourced title and episode ratings without payment", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TV_ID)}`, { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      unlocked: boolean;
      rating: number | null;
      episodes: { season: number; episode: number; rating: number | null }[];
      imdbRating?: unknown;
      tmdbRating?: unknown;
    };
    expect(body.unlocked).toBe(true);
    expect(body.rating).toBe(8.1);
    expect(body.episodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ season: 1, episode: 1, rating: 7.8 }),
        expect.objectContaining({ season: 1, episode: 2, rating: 8.2 }),
      ])
    );
    expect(body).not.toHaveProperty("imdbRating");
    expect(body).not.toHaveProperty("tmdbRating");
  });

  it("returns movie rating without unlock or OMDb", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(MOVIE_ID)}`, { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { unlocked: boolean; rating: number | null };
    expect(body.unlocked).toBe(true);
    expect(body.rating).toBe(8.4);
  });

  it("accepts a free comment without a payment hash", async () => {
    const post = await app.fetch(
      new Request("http://test/api/comments", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: MOVIE_ID, body: "Great movie" }),
      })
    );
    expect(post.status).toBe(200);

    const list = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(MOVIE_ID)}/comments`, {
        headers,
      })
    );
    expect(list.status).toBe(200);
    const body = (await list.json()) as { comments: { body: string }[] };
    expect(body.comments.some((c) => c.body === "Great movie")).toBe(true);
  });

  it("rejects retired catalog payment endpoints", async () => {
    const unlock = await app.fetch(
      new Request("http://test/api/unlocks", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: TV_ID, txHash: "demo:nope" }),
      })
    );
    expect(unlock.status).toBe(410);

    const lifetime = await app.fetch(
      new Request("http://test/api/lifetime", {
        method: "POST",
        headers,
        body: JSON.stringify({ txHash: "demo:nope" }),
      })
    );
    expect(lifetime.status).toBe(410);
  });
});
