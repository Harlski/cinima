import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-api-"));
const dbFile = path.join(dataDir, "test.db");
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05 TESTWALLET FOR WATCHLIST API TESTS0001";
const TITLE_ID = "movie:99";
const MOVIE_A = "movie:1";
const MOVIE_B = "movie:2";
const MOVIE_C = "movie:3";
const MOVIE_D = "movie:4";
const TV_A = "tv:1";
const TV_B = "tv:2";
const TOKEN = "test-session-token-watchlist-roundtrip";

describe("Watchlist HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  beforeAll(async () => {
    const migrateMod = await import("../src/db/migrate.js");
    await migrateMod.migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");

    await db.insert(schema.users).values({
      walletAddress: WALLET,
      handle: null,
      lifetimeUnlockedAt: null,
      createdAt: new Date(),
    });
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
    await db.insert(schema.titles).values(
      [
        { id: TITLE_ID, mediaType: "movie", tmdbId: 99, title: "Watchlist Test Movie" },
        { id: MOVIE_A, mediaType: "movie", tmdbId: 1, title: "Movie A" },
        { id: MOVIE_B, mediaType: "movie", tmdbId: 2, title: "Movie B" },
        { id: MOVIE_C, mediaType: "movie", tmdbId: 3, title: "Movie C" },
        { id: MOVIE_D, mediaType: "movie", tmdbId: 4, title: "Movie D" },
        { id: TV_A, mediaType: "tv", tmdbId: 1, title: "Show A" },
        { id: TV_B, mediaType: "tv", tmdbId: 2, title: "Show B" },
      ].map((row) => ({
        ...row,
        year: 2025,
        posterPath: null,
        overview: "fixture",
        imdbId: null,
        rating: "7.5",
        fetchedAt: new Date(),
        source: "seed",
      }))
    );

    const appMod = await import("../src/app.js");
    app = appMod.app;
  });

  it("user can add to watchlist, list it on Me, then remove", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };

    const addRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(addRes.status).toBe(200);

    const listRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { items: { id: string }[] };
    expect(listBody.items.map((item) => item.id)).toContain(TITLE_ID);

    const meRes = await app.fetch(new Request("http://test/api/me", { headers }));
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { watchlist: { id: string }[] };
    expect(me.watchlist.map((item) => item.id)).toContain(TITLE_ID);

    const titleRes = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}`, { headers })
    );
    expect(titleRes.status).toBe(200);
    const title = (await titleRes.json()) as { watchlisted: boolean };
    expect(title.watchlisted).toBe(true);

    const delRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
      })
    );
    expect(delRes.status).toBe(200);

    const afterRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    const afterBody = (await afterRes.json()) as { items: { id: string }[] };
    expect(afterBody.items.map((item) => item.id)).not.toContain(TITLE_ID);
  });

  it("records an optional Watchlist leave reason and rejects unknown reasons", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };

    const addRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(addRes.status).toBe(200);

    const bad = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ reason: "watched" }),
      })
    );
    expect(bad.status).toBe(400);

    const stillThere = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(
      ((await stillThere.json()) as { items: { id: string }[] }).items.map((item) => item.id)
    ).toContain(TITLE_ID);

    const delRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ reason: "finished" }),
      })
    );
    expect(delRes.status).toBe(200);
    expect(((await delRes.json()) as { ok: boolean; removed: boolean }).removed).toBe(true);

    const afterRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(
      ((await afterRes.json()) as { items: { id: string }[] }).items.map((item) => item.id)
    ).not.toContain(TITLE_ID);

    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const { eq } = await import("drizzle-orm");
    const leaves = await db
      .select()
      .from(schema.watchlistLeaves)
      .where(eq(schema.watchlistLeaves.titleId, TITLE_ID));
    expect(leaves.some((row) => row.reason === "finished")).toBe(true);
    const leaveCount = leaves.length;

    const noop = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
      })
    );
    expect(noop.status).toBe(200);
    expect(((await noop.json()) as { removed: boolean }).removed).toBe(false);
    const leavesAfterNoop = await db
      .select()
      .from(schema.watchlistLeaves)
      .where(eq(schema.watchlistLeaves.titleId, TITLE_ID));
    expect(leavesAfterNoop).toHaveLength(leaveCount);
  });

  it("flings only the visible media type and prepends a new add of that type", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };

    for (const id of [MOVIE_A, TV_A, MOVIE_B, TV_B, MOVIE_C]) {
      const add = await app.fetch(
        new Request(`http://test/api/watchlist/${encodeURIComponent(id)}`, {
          method: "POST",
          headers,
        })
      );
      expect(add.status).toBe(200);
    }

    const beforeRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(
      ((await beforeRes.json()) as { items: { id: string }[] }).items.map((item) => item.id)
    ).toEqual([MOVIE_C, TV_B, MOVIE_B, TV_A, MOVIE_A]);

    const fling = await app.fetch(
      new Request("http://test/api/watchlist/fling", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mediaType: "movie",
          titleIds: [MOVIE_A, MOVIE_C, MOVIE_B],
        }),
      })
    );
    expect(fling.status).toBe(200);
    const flung = (await fling.json()) as { items: { id: string }[] };
    expect(flung.items.map((item) => item.id)).toEqual([
      MOVIE_A,
      TV_B,
      MOVIE_C,
      TV_A,
      MOVIE_B,
    ]);

    const addNew = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(MOVIE_D)}`, {
        method: "POST",
        headers,
      })
    );
    expect(addNew.status).toBe(200);
    const afterAdd = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(
      ((await afterAdd.json()) as { items: { id: string }[] }).items.map((item) => item.id)
    ).toEqual([MOVIE_D, MOVIE_A, TV_B, MOVIE_C, TV_A, MOVIE_B]);
  });

  it("rejects a Watchlist fling that does not mix the visible titles", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };
    const same = await app.fetch(
      new Request("http://test/api/watchlist/fling", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mediaType: "tv",
          titleIds: [TV_B, TV_A],
        }),
      })
    );
    expect(same.status).toBe(400);
    expect(((await same.json()) as { error: string }).error).toBe("unchanged");
  });

  it("awards Jump cut on the tenth Watchlist fling after the Guided tour", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };
    const skip = await app.fetch(
      new Request("http://test/api/tour/skip", {
        method: "POST",
        headers,
      })
    );
    expect(skip.status).toBe(200);

    const orders = [
      [MOVIE_C, MOVIE_A, MOVIE_B, MOVIE_D],
      [MOVIE_B, MOVIE_D, MOVIE_A, MOVIE_C],
      [MOVIE_A, MOVIE_B, MOVIE_D, MOVIE_C],
      [MOVIE_D, MOVIE_C, MOVIE_B, MOVIE_A],
      [MOVIE_C, MOVIE_B, MOVIE_A, MOVIE_D],
      [MOVIE_B, MOVIE_A, MOVIE_C, MOVIE_D],
      [MOVIE_A, MOVIE_D, MOVIE_C, MOVIE_B],
      [MOVIE_D, MOVIE_B, MOVIE_C, MOVIE_A],
      [MOVIE_C, MOVIE_D, MOVIE_B, MOVIE_A],
      [MOVIE_B, MOVIE_C, MOVIE_D, MOVIE_A],
    ];
    let awarded = false;
    for (const titleIds of orders) {
      const fling = await app.fetch(
        new Request("http://test/api/watchlist/fling", {
          method: "POST",
          headers,
          body: JSON.stringify({ mediaType: "movie", titleIds }),
        })
      );
      expect(fling.status).toBe(200);
      const body = (await fling.json()) as { earnedAchievements?: string[] };
      if (body.earnedAchievements?.includes("jump-cut")) awarded = true;
    }
    expect(awarded).toBe(true);
  });
});
