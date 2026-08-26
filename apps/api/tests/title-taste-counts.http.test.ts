import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-title-taste-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05TASTECOUNTTESTWALLETME00000001";
const PEER_REC = "NQ05TASTECOUNTTESTPEERREC0000001";
const PEER_FAV = "NQ05TASTECOUNTTESTPEERFAV0000001";
const PEER_FAV2 = "NQ05TASTECOUNTTESTPEERFAV2000001";
const TOKEN = "test-session-token-taste-counts";
const TITLE_ID = "tmdb:movie:680";

describe("Title taste counts HTTP API", () => {
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

    await db.insert(schema.users).values([
      { walletAddress: ME, handle: "meuser", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER_REC, handle: "peerrec", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER_FAV, handle: "peerfav", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER_FAV2, handle: "peerfav2", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: ME,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    await db.insert(schema.titles).values({
      id: TITLE_ID,
      mediaType: "movie",
      tmdbId: 680,
      title: "Pulp Fiction",
      year: 1994,
      posterPath: null,
      overview: "fixture",
      imdbId: "tt0110912",
      rating: "8.9",
      fetchedAt: now,
      source: "seed",
    });
    await db.insert(schema.favorites).values([
      {
        walletAddress: ME,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: now,
      },
      {
        walletAddress: PEER_REC,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: now,
      },
      {
        walletAddress: PEER_FAV,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: null,
      },
      {
        walletAddress: PEER_FAV2,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: null,
      },
    ]);

    app = (await import("../src/app.js")).app;
  });

  it("reports exclusive peer Recommend and Favorite counts on title detail", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}`, { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      recommendCount: number;
      favoriteCount: number;
    };
    // Self Recommend is excluded; peer Recommend is not counted as Favorite
    expect(body.recommendCount).toBe(1);
    expect(body.favoriteCount).toBe(2);
  });

  it("marks suggesters as recommended vs favorite-only", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}/suggesters`, {
        headers,
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      suggesters: { walletAddress: string; recommended: boolean }[];
    };
    expect(body.suggesters).toHaveLength(3);
    expect(body.suggesters.find((s) => s.walletAddress === PEER_REC)?.recommended).toBe(true);
    expect(body.suggesters.find((s) => s.walletAddress === PEER_FAV)?.recommended).toBe(false);
    expect(body.suggesters.find((s) => s.walletAddress === PEER_FAV2)?.recommended).toBe(false);
    expect(body.suggesters.some((s) => s.walletAddress === ME)).toBe(false);
  });
});
