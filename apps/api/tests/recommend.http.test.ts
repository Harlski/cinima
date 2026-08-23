import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { MAX_RECOMMENDS } from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-recommend-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05RECOMMENDTESTWALLET000000000001";
const TOKEN = "test-session-token-recommend";
const TITLE_IDS = Array.from({ length: MAX_RECOMMENDS + 1 }, (_, i) => `movie:${100 + i}`);
const TV_IDS = Array.from({ length: MAX_RECOMMENDS + 1 }, (_, i) => `tv:${200 + i}`);

describe("Recommend HTTP API", () => {
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

    await db.insert(schema.users).values({
      walletAddress: WALLET,
      handle: "recuser",
      lifetimeUnlockedAt: null,
      createdAt: new Date(),
    });
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
    for (const [i, id] of TITLE_IDS.entries()) {
      await db.insert(schema.titles).values({
        id,
        mediaType: "movie",
        tmdbId: 100 + i,
        title: `Movie ${i}`,
        year: 2020 + i,
        posterPath: null,
        overview: null,
        imdbId: null,
        rating: "7.0",
        fetchedAt: new Date(),
        source: "seed",
      });
    }
    for (const [i, id] of TV_IDS.entries()) {
      await db.insert(schema.titles).values({
        id,
        mediaType: "tv",
        tmdbId: 200 + i,
        title: `Show ${i}`,
        year: 2018 + i,
        posterPath: null,
        overview: null,
        imdbId: null,
        rating: "8.0",
        fetchedAt: new Date(),
        source: "seed",
      });
    }

    app = (await import("../src/app.js")).app;

    for (const id of TITLE_IDS) {
      const res = await app.fetch(
        new Request(`http://test/api/favorites/${encodeURIComponent(id)}`, {
          method: "POST",
          headers,
        })
      );
      expect(res.status).toBe(200);
    }
  });

  it("rejects Recommend without Favorite", async () => {
    await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(TITLE_IDS[0])}`, {
        method: "DELETE",
        headers,
      })
    );
    const res = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[0])}`, {
        method: "POST",
        headers,
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_favorited");
    // restore favorite for later tests
    await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(TITLE_IDS[0])}`, {
        method: "POST",
        headers,
      })
    );
  });

  it("sets and clears Recommend while keeping Favorite", async () => {
    const setRes = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[0])}`, {
        method: "POST",
        headers,
      })
    );
    expect(setRes.status).toBe(200);

    const titleRes = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_IDS[0])}`, { headers })
    );
    const title = (await titleRes.json()) as { favorited: boolean; recommended: boolean };
    expect(title.favorited).toBe(true);
    expect(title.recommended).toBe(true);

    const clearRes = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[0])}`, {
        method: "DELETE",
        headers,
      })
    );
    expect(clearRes.status).toBe(200);

    const title2 = (await (
      await app.fetch(
        new Request(`http://test/api/titles/${encodeURIComponent(TITLE_IDS[0])}`, { headers })
      )
    ).json()) as { favorited: boolean; recommended: boolean };
    expect(title2.favorited).toBe(true);
    expect(title2.recommended).toBe(false);
  });

  it("blocks a seventh Recommend at the hard cap", async () => {
    for (let i = 0; i < MAX_RECOMMENDS; i++) {
      const res = await app.fetch(
        new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[i])}`, {
          method: "POST",
          headers,
        })
      );
      expect(res.status).toBe(200);
    }
    const overCap = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[MAX_RECOMMENDS])}`, {
        method: "POST",
        headers,
      })
    );
    expect(overCap.status).toBe(409);
    const body = (await overCap.json()) as { error: string };
    expect(body.error).toBe("recommend_cap");
  });

  it("unfavoriting clears Recommend", async () => {
    const id = TITLE_IDS[0];
    const titleBefore = (await (
      await app.fetch(new Request(`http://test/api/titles/${encodeURIComponent(id)}`, { headers }))
    ).json()) as { recommended: boolean };
    expect(titleBefore.recommended).toBe(true);

    await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      })
    );
    await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(id)}`, {
        method: "POST",
        headers,
      })
    );

    const titleAfter = (await (
      await app.fetch(new Request(`http://test/api/titles/${encodeURIComponent(id)}`, { headers }))
    ).json()) as { favorited: boolean; recommended: boolean };
    expect(titleAfter.favorited).toBe(true);
    expect(titleAfter.recommended).toBe(false);
  });

  it("Me and public profile expose recommends distinctly", async () => {
    // Ensure at least one recommend
    await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[1])}`, {
        method: "POST",
        headers,
      })
    );

    const me = (await (
      await app.fetch(new Request("http://test/api/me", { headers }))
    ).json()) as {
      recommends: { id: string }[];
      favorites: { id: string; recommended?: boolean }[];
    };
    expect(me.recommends.some((r) => r.id === TITLE_IDS[1])).toBe(true);
    const fav = me.favorites.find((f) => f.id === TITLE_IDS[1]);
    expect(fav?.recommended).toBe(true);

    const pub = (await (
      await app.fetch(new Request("http://test/api/public/recuser"))
    ).json()) as {
      recommends: { id: string }[];
      favorites: { id: string; recommended?: boolean }[];
    };
    expect(pub.recommends.some((r) => r.id === TITLE_IDS[1])).toBe(true);
    expect(pub.favorites.find((f) => f.id === TITLE_IDS[1])?.recommended).toBe(true);

    const peer = (await (
      await app.fetch(
        new Request(`http://test/api/users/${encodeURIComponent(WALLET)}`, { headers })
      )
    ).json()) as {
      recommends: { id: string }[];
      favorites: { id: string; recommended?: boolean }[];
    };
    expect(peer.recommends.some((r) => r.id === TITLE_IDS[1])).toBe(true);
    expect(peer.favorites.find((f) => f.id === TITLE_IDS[1])?.recommended).toBe(true);
  });

  it("caps Recommends per media type, not across movies and TV", async () => {
    for (const id of TV_IDS) {
      const fav = await app.fetch(
        new Request(`http://test/api/favorites/${encodeURIComponent(id)}`, {
          method: "POST",
          headers,
        })
      );
      expect(fav.status).toBe(200);
    }

    const meStart = (await (
      await app.fetch(new Request("http://test/api/me", { headers }))
    ).json()) as {
      recommends: { id: string; mediaType: string }[];
    };
    const movieRecIds = new Set(
      meStart.recommends.filter((r) => r.mediaType === "movie").map((r) => r.id)
    );
    for (const id of TITLE_IDS) {
      if (movieRecIds.size >= MAX_RECOMMENDS) break;
      if (movieRecIds.has(id)) continue;
      const topUp = await app.fetch(
        new Request(`http://test/api/recommends/${encodeURIComponent(id)}`, {
          method: "POST",
          headers,
        })
      );
      expect(topUp.status).toBe(200);
      movieRecIds.add(id);
    }

    for (let i = 0; i < MAX_RECOMMENDS; i++) {
      const res = await app.fetch(
        new Request(`http://test/api/recommends/${encodeURIComponent(TV_IDS[i])}`, {
          method: "POST",
          headers,
        })
      );
      expect(res.status).toBe(200);
    }

    const overCapTv = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TV_IDS[MAX_RECOMMENDS])}`, {
        method: "POST",
        headers,
      })
    );
    expect(overCapTv.status).toBe(409);
    const tvBody = (await overCapTv.json()) as { error: string; message: string };
    expect(tvBody.error).toBe("recommend_cap");
    expect(tvBody.message).toMatch(/TV/i);

    const me = (await (
      await app.fetch(new Request("http://test/api/me", { headers }))
    ).json()) as {
      recommends: { id: string; mediaType: string }[];
    };
    expect(me.recommends.filter((r) => r.mediaType === "movie").length).toBe(MAX_RECOMMENDS);
    expect(me.recommends.filter((r) => r.mediaType === "tv").length).toBe(MAX_RECOMMENDS);

    const overCapMovie = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_IDS[MAX_RECOMMENDS])}`, {
        method: "POST",
        headers,
      })
    );
    expect(overCapMovie.status).toBe(409);
    const movieBody = (await overCapMovie.json()) as { error: string; message: string };
    expect(movieBody.message).toMatch(/movie/i);
  });
});
