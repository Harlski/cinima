import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-search-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
delete process.env.TMDB_API_KEY;

const WALLET = "NQ05 SEARCHTESTWALLET000000000000001";
const TOKEN = "test-session-token-search";
const TITLE_ID = "tmdb:movie:42";

describe("Search HTTP API", () => {
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
      id: TITLE_ID,
      mediaType: "movie",
      tmdbId: 42,
      title: "Popcorn Movie",
      year: 2024,
      posterPath: null,
      overview: "fixture",
      imdbId: "tt0000042",
      rating: "8.4",
      popularity: 42.5,
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;
  });

  it("returns TMDB Popularity on each search result", async () => {
    const res = await app.fetch(
      new Request("http://test/api/search?q=Popcorn", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { id: string; title: string; popularity: number | null }[];
    };
    expect(body.results).toEqual([
      expect.objectContaining({
        id: TITLE_ID,
        title: "Popcorn Movie",
        popularity: 42.5,
      }),
    ]);
  });
});
