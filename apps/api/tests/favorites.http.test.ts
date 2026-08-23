import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-api-"));
const dbFile = path.join(dataDir, "test.db");
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05TESTWALLETFORFAVORITEAPITESTS0001";
const TITLE_ID = "movie:42";
const TOKEN = "test-session-token-favorite-roundtrip";

describe("Favorite HTTP API", () => {
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
    await db.insert(schema.titles).values({
      id: TITLE_ID,
      mediaType: "movie",
      tmdbId: 42,
      title: "Test Movie",
      year: 2024,
      posterPath: null,
      overview: "fixture",
      imdbId: null,
      rating: "8.0",
      fetchedAt: new Date(),
      source: "seed",
    });

    const appMod = await import("../src/app.js");
    app = appMod.app;
  });

  it("user can favorite a title and see it on Me, then unfavorite", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };

    const addRes = await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(addRes.status).toBe(200);
    const addBody = (await addRes.json()) as { ok: boolean; user: { favoriteCount: number } };
    expect(addBody.ok).toBe(true);
    expect(addBody.user.favoriteCount).toBe(1);

    const meRes = await app.fetch(new Request("http://test/api/me", { headers }));
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { favorites: { id: string }[] };
    expect(me.favorites.map((f) => f.id)).toContain(TITLE_ID);

    const delRes = await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
      })
    );
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { ok: boolean; user: { favoriteCount: number } };
    expect(delBody.ok).toBe(true);
    expect(delBody.user.favoriteCount).toBe(0);

    const meAfter = await app.fetch(new Request("http://test/api/me", { headers }));
    const me2 = (await meAfter.json()) as { favorites: { id: string }[] };
    expect(me2.favorites.map((f) => f.id)).not.toContain(TITLE_ID);
  });

  it("Discover returns onboarding while under the favorite minimum", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "X-Cinima-Demo": "1",
    };
    const res = await app.fetch(new Request("http://test/api/discover", { headers }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mode: string;
      favoriteCount: number;
      onboardingCandidates?: unknown[];
    };
    expect(body.mode).toBe("onboarding");
    expect(body.favoriteCount).toBe(0);
    expect(Array.isArray(body.onboardingCandidates)).toBe(true);
  });

  it("ranks onboarding candidates by peer Favorite count among cached titles", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "X-Cinima-Demo": "1",
    };
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const peer = "NQ05PEERWALLETFORONBOARDINGRANKTESTS01";
    await db.insert(schema.users).values({
      walletAddress: peer,
      handle: null,
      lifetimeUnlockedAt: null,
      createdAt: new Date(),
    });
    const hotId = "movie:99";
    const coldId = "movie:98";
    await db.insert(schema.titles).values([
      {
        id: hotId,
        mediaType: "movie",
        tmdbId: 99,
        title: "Hot Cached",
        year: 2020,
        posterPath: "/hot.jpg",
        overview: "hot",
        imdbId: null,
        rating: "5.0",
        popularity: 10,
        fetchedAt: new Date(),
        source: "seed",
      },
      {
        id: coldId,
        mediaType: "movie",
        tmdbId: 98,
        title: "Cold Cached",
        year: 2021,
        posterPath: "/cold.jpg",
        overview: "cold",
        imdbId: null,
        rating: "9.5",
        popularity: 90,
        fetchedAt: new Date(),
        source: "seed",
      },
    ]);
    await db.insert(schema.favorites).values({
      walletAddress: peer,
      titleId: hotId,
      createdAt: new Date(),
      recommendedAt: null,
    });

    const res = await app.fetch(new Request("http://test/api/discover", { headers }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mode: string;
      onboardingCandidates?: { id: string }[];
    };
    expect(body.mode).toBe("onboarding");
    const ids = (body.onboardingCandidates ?? []).map((t) => t.id);
    expect(ids.indexOf(hotId)).toBeLessThan(ids.indexOf(coldId));
  });

  it("skip onboarding returns overlap mode without Favorites", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "X-Cinima-Demo": "1",
    };
    const res = await app.fetch(
      new Request("http://test/api/discover/skip-onboarding", {
        method: "POST",
        headers,
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mode: string;
      favoriteCount: number;
      suggestions?: unknown[];
    };
    expect(body.mode).toBe("overlap");
    expect(body.favoriteCount).toBe(0);
    expect(Array.isArray(body.suggestions)).toBe(true);

    const again = await app.fetch(new Request("http://test/api/discover", { headers }));
    const againBody = (await again.json()) as { mode: string };
    expect(againBody.mode).toBe("overlap");
  });


  it("forceOnboarding returns onboarding mode even after skip", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "X-Cinima-Demo": "1",
    };
    const res = await app.fetch(
      new Request("http://test/api/discover?forceOnboarding=1", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      mode: string;
      onboardingCandidates?: unknown[];
    };
    expect(body.mode).toBe("onboarding");
    expect(Array.isArray(body.onboardingCandidates)).toBe(true);
  });

});
