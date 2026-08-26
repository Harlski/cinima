import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-following-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05FOLLOWTESTWALLETME000000000001";
const CURATOR = "NQ05FOLLOWTESTWALLETCURATOR0000001";
const OTHER = "NQ05FOLLOWTESTWALLETOOTHER0000001";
const TOKEN = "test-session-token-following";
const MOVIE_ID = "tmdb:movie:550";
const TV_ID = "tmdb:tv:1396";

describe("Following strip HTTP API", () => {
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
    const older = new Date(now.getTime() - 60_000);

    await db.insert(schema.users).values([
      { walletAddress: ME, handle: "meuser", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: CURATOR, handle: "curator", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: OTHER, handle: "otheruser", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: ME,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    await db.insert(schema.titles).values([
      {
        id: MOVIE_ID,
        mediaType: "movie",
        tmdbId: 550,
        title: "Fight Club",
        year: 1999,
        posterPath: null,
        overview: "fixture",
        imdbId: "tt0137523",
        rating: "8.4",
        fetchedAt: now,
        source: "seed",
      },
      {
        id: TV_ID,
        mediaType: "tv",
        tmdbId: 1396,
        title: "Breaking Bad",
        year: 2008,
        posterPath: null,
        overview: "fixture",
        imdbId: "tt0903747",
        rating: "9.5",
        fetchedAt: now,
        source: "seed",
      },
    ]);
    await db.insert(schema.favorites).values([
      { walletAddress: CURATOR, titleId: MOVIE_ID, createdAt: now, recommendedAt: null },
      { walletAddress: CURATOR, titleId: TV_ID, createdAt: older, recommendedAt: null },
      { walletAddress: OTHER, titleId: MOVIE_ID, createdAt: older, recommendedAt: null },
      { walletAddress: OTHER, titleId: TV_ID, createdAt: older, recommendedAt: null },
    ]);
    await db.insert(schema.thanks).values({
      fromWallet: ME,
      toWallet: OTHER,
      titleId: MOVIE_ID,
      tipTxHash: null,
      createdAt: now,
    });
    await db.insert(schema.follows).values({
      followerWallet: ME,
      followeeWallet: CURATOR,
      createdAt: now,
    });

    app = (await import("../src/app.js")).app;
  });

  it("lists followees for the Following strip, newest activity first", async () => {
    const res = await app.fetch(new Request("http://test/api/following", { headers }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      people: { walletAddress: string; handle: string | null }[];
    };
    expect(body.people).toEqual([
      {
        walletAddress: CURATOR,
        handle: "curator",
        lastActivityAt: expect.any(String),
      },
    ]);
    expect(Date.parse(body.people[0]!.lastActivityAt!)).not.toBeNaN();
  });

  it("filters the Following feed to one followee", async () => {
    const all = await app.fetch(new Request("http://test/api/feed", { headers }));
    expect(all.status).toBe(200);
    const allBody = (await all.json()) as { items: { walletAddress: string }[] };
    expect(allBody.items.every((i) => i.walletAddress === CURATOR)).toBe(true);

    const filtered = await app.fetch(
      new Request(`http://test/api/feed?followee=${encodeURIComponent(CURATOR)}`, { headers })
    );
    expect(filtered.status).toBe(200);
    const body = (await filtered.json()) as {
      items: { walletAddress: string; type: string; title: { id: string } }[];
    };
    expect(body.items.length).toBeGreaterThanOrEqual(2);
    expect(body.items.every((i) => i.walletAddress === CURATOR)).toBe(true);
    expect(body.items.map((i) => i.title.id).sort()).toEqual([MOVIE_ID, TV_ID].sort());
  });

  it("rejects feed filter for someone the viewer does not follow", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/feed?followee=${encodeURIComponent(OTHER)}`, { headers })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_following");
  });

  it("lists Find people with Favorite counts and Thanks received, excluding followees", async () => {
    const res = await app.fetch(new Request("http://test/api/find-people", { headers }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      people: {
        walletAddress: string;
        handle: string | null;
        movieFavoriteCount: number;
        tvFavoriteCount: number;
        thanksReceived: number;
        isFollowing: boolean;
      }[];
    };
    expect(body.people.map((p) => p.walletAddress)).not.toContain(ME);
    expect(body.people.map((p) => p.walletAddress)).not.toContain(CURATOR);
    const other = body.people.find((p) => p.walletAddress === OTHER);
    expect(other).toMatchObject({
      handle: "otheruser",
      movieFavoriteCount: 1,
      tvFavoriteCount: 1,
      thanksReceived: 1,
      isFollowing: false,
    });
    expect(body.people[0]?.walletAddress).toBe(OTHER);
  });
});
