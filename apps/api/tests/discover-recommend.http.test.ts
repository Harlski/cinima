import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-discover-rec-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05DISCOVERMEWALLET00000000000001";
const PEER_REC = "NQ05DISCOVERPEERREC00000000000001";
const PEER_FAV = "NQ05DISCOVERPEERFAV00000000000001";
const TOKEN = "test-session-discover-recommend";

const SHARED_A = "movie:1";
const SHARED_B = "movie:2";
const SHARED_C = "movie:3";
const GOLD = "movie:gold";
const PLAIN = "movie:plain";
const BARE = "movie:bare";

describe("Discover Recommend-weighted overlap", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");

    const now = new Date();
    for (const wallet of [ME, PEER_REC, PEER_FAV]) {
      await db.insert(schema.users).values({
        walletAddress: wallet,
        handle: wallet === ME ? "me" : null,
        lifetimeUnlockedAt: null,
        createdAt: now,
      });
    }
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: ME,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });

    for (const [id, tmdbId, title, overview] of [
      [SHARED_A, 1, "Shared A", "Shared favorite A."],
      [SHARED_B, 2, "Shared B", "Shared favorite B."],
      [SHARED_C, 3, "Shared C", "Shared favorite C."],
      [GOLD, 4, "Gold Recommend Title", "A peer Recommended this title."],
      [PLAIN, 5, "Plain Favorite Title", "A peer Favorited this title."],
      [BARE, 6, "No Overview Title", null],
    ] as const) {
      await db.insert(schema.titles).values({
        id,
        mediaType: "movie",
        tmdbId,
        title,
        year: 2020,
        posterPath: null,
        overview,
        imdbId: null,
        rating: "7.0",
        fetchedAt: now,
        source: "seed",
      });
    }

    // Me: three favorites (unlocks overlap mode)
    for (const titleId of [SHARED_A, SHARED_B, SHARED_C]) {
      await db.insert(schema.favorites).values({
        walletAddress: ME,
        titleId,
        createdAt: now,
        recommendedAt: null,
      });
    }

    // Peer with Recommend on GOLD and BARE — same shared favorites as the other peer
    for (const titleId of [SHARED_A, SHARED_B, GOLD, BARE]) {
      await db.insert(schema.favorites).values({
        walletAddress: PEER_REC,
        titleId,
        createdAt: now,
        recommendedAt: titleId === GOLD || titleId === BARE ? now : null,
      });
    }

    // Peer with plain Favorite on PLAIN
    for (const titleId of [SHARED_A, SHARED_B, PLAIN]) {
      await db.insert(schema.favorites).values({
        walletAddress: PEER_FAV,
        titleId,
        createdAt: now,
        recommendedAt: null,
      });
    }

    app = (await import("../src/app.js")).app;
  });

  it("ranks shared Recommend overlap above Favorite-only overlap", async () => {
    const res = await app.fetch(
      new Request("http://test/api/discover", {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "X-Cinima-Demo": "1",
        },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mode: string;
      suggestions: { title: { id: string } }[];
    };
    expect(body.mode).toBe("overlap");
    const ids = body.suggestions.map((s) => s.title.id);
    expect(ids).toContain(GOLD);
    expect(ids).toContain(PLAIN);
    expect(ids.indexOf(GOLD)).toBeLessThan(ids.indexOf(PLAIN));
    expect(ids).not.toContain(BARE);
    for (const suggestion of body.suggestions) {
      expect(suggestion.title.overview?.trim()).toBeTruthy();
    }
  });
});
