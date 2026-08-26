import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-community-rec-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05COMMUNITYRECTESTWALLET000000001";
const PEER = "NQ01PEERCOMMUNITYRECTESTWALLET0001";
const TOKEN = "test-session-token-community-rec";

describe("Community Recommends HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };
  let db: typeof import("../src/db/index.js").db;
  let schema: typeof import("../src/db/schema.js");

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    const migrateMod = await import("../src/db/migrate.js");
    await migrateMod.migrate();
    db = (await import("../src/db/index.js")).db;
    schema = await import("../src/db/schema.js");

    await db.insert(schema.users).values([
      {
        walletAddress: WALLET,
        handle: "viewer",
        lifetimeUnlockedAt: null,
        createdAt: new Date(),
      },
      {
        walletAddress: PEER,
        handle: "curator",
        lifetimeUnlockedAt: null,
        createdAt: new Date(),
      },
    ]);
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const catalog = [
      {
        id: "movie:550",
        mediaType: "movie" as const,
        tmdbId: 550,
        title: "Fight Club",
        year: 1999,
        posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        overview: "An office worker and a soap maker form an underground fight club.",
        rating: "8.4",
      },
      {
        id: "movie:278",
        mediaType: "movie" as const,
        tmdbId: 278,
        title: "The Shawshank Redemption",
        year: 1994,
        posterPath: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
        overview: "Two imprisoned men bond over years.",
        rating: "8.7",
      },
      {
        id: "tv:1396",
        mediaType: "tv" as const,
        tmdbId: 1396,
        title: "Breaking Bad",
        year: 2008,
        posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        overview: "A chemistry teacher turns to cooking meth.",
        rating: "8.9",
      },
      {
        id: "tv:1399",
        mediaType: "tv" as const,
        tmdbId: 1399,
        title: "Game of Thrones",
        year: 2011,
        posterPath: "/1XS1oqLxiqw6YP0dVQcXBztE4l.jpg",
        overview: "Nine noble families fight for control.",
        rating: "8.4",
      },
    ];

    for (const t of catalog) {
      await db.insert(schema.titles).values({
        ...t,
        imdbId: null,
        fetchedAt: new Date(),
        source: "seed",
      });
    }

    const now = Date.now();
    await db.insert(schema.favorites).values([
      {
        walletAddress: PEER,
        titleId: "movie:550",
        createdAt: new Date(now - 86400000),
        recommendedAt: new Date(now - 86400000),
      },
      {
        walletAddress: PEER,
        titleId: "tv:1396",
        createdAt: new Date(now - 2 * 86400000),
        recommendedAt: new Date(now - 2 * 86400000),
      },
      {
        walletAddress: PEER,
        titleId: "movie:278",
        createdAt: new Date(now - 3 * 86400000),
        recommendedAt: null,
      },
    ]);

    app = (await import("../src/app.js")).app;
  });

  it("returns peer Recommends split into movies and TV", async () => {
    const res = await app.fetch(
      new Request("http://test/api/recommends/community", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      movies: { id: string; recommended?: boolean }[];
      tv: { id: string; recommended?: boolean }[];
    };

    expect(body.movies.some((t) => t.id === "movie:550")).toBe(true);
    expect(body.tv.some((t) => t.id === "tv:1396")).toBe(true);
    expect(body.movies.find((t) => t.id === "movie:550")?.recommended).toBe(true);
  });

  it("excludes titles already on the caller's watchlist", async () => {
    await db.insert(schema.watchlist).values({
      walletAddress: WALLET,
      titleId: "movie:550",
      createdAt: new Date(),
    });

    const res = await app.fetch(
      new Request("http://test/api/recommends/community", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { movies: { id: string }[]; tv: { id: string }[] };
    expect(body.movies.some((t) => t.id === "movie:550")).toBe(false);
    expect(body.tv.some((t) => t.id === "tv:1396")).toBe(true);
  });
});
