import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CREATOR_WALLET } from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-studio-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const OTHER = "NQ05STUDIOOTHERWALLET0000000000001";
const CREATOR_TOKEN = "test-session-token-studio-creator";
const OTHER_TOKEN = "test-session-token-studio-other";
const MOVIE_ID = "tmdb:movie:550";

describe("Studio HTTP API", () => {
  let studioApp: { fetch: (request: Request) => Response | Promise<Response> };
  let publicApp: { fetch: (request: Request) => Response | Promise<Response> };

  const creatorHeaders = {
    Authorization: `Bearer ${CREATOR_TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };
  const otherHeaders = {
    Authorization: `Bearer ${OTHER_TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const { recordSearch, recordView, recordHeartbeat } = await import(
      "../src/services/usage.js"
    );
    const now = new Date();
    const todayStart = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      12,
      0,
      0
    );

    await db.insert(schema.users).values([
      {
        walletAddress: CREATOR_WALLET,
        handle: "cinima",
        lifetimeUnlockedAt: null,
        createdAt: now,
      },
      {
        walletAddress: OTHER,
        handle: "peer",
        lifetimeUnlockedAt: null,
        createdAt: now,
      },
    ]);
    await db.insert(schema.sessions).values([
      {
        token: CREATOR_TOKEN,
        walletAddress: CREATOR_WALLET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: OTHER_TOKEN,
        walletAddress: OTHER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
    ]);
    await db.insert(schema.titles).values({
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
    });
    await db.insert(schema.favorites).values({
      walletAddress: OTHER,
      titleId: MOVIE_ID,
      createdAt: now,
      recommendedAt: now,
    });
    await db.insert(schema.follows).values({
      followerWallet: OTHER,
      followeeWallet: CREATOR_WALLET,
      createdAt: now,
    });
    await db.insert(schema.shareLinks).values({
      code: "abc123xy",
      kind: "title",
      handle: "peer",
      mediaType: "movie",
      tmdbId: 550,
      walletAddress: OTHER,
      createdAt: now,
    });
    await recordSearch(OTHER, "Dune", todayStart);
    await recordView(OTHER, MOVIE_ID, todayStart);
    await recordHeartbeat(OTHER, todayStart);
    await recordHeartbeat(OTHER, todayStart + 45_000);

    studioApp = (await import("../src/studio.js")).studioApp;
    publicApp = (await import("../src/app.js")).app;
  });

  it("rejects Studio without a session", async () => {
    const res = await studioApp.fetch(new Request("http://test/api/studio"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("hides Studio from a signed-in Handle that is not the Creator", async () => {
    const res = await studioApp.fetch(
      new Request("http://test/api/studio", { headers: otherHeaders })
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: "not_found" });
    expect(body.totals).toBeUndefined();
  });

  it("does not compute Studio on the public API when upstream is unset", async () => {
    const res = await publicApp.fetch(
      new Request("http://test/api/studio", { headers: creatorHeaders })
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toMatch(/not found/i);
  });

  it("returns 502 from the public API when Studio upstream is down", async () => {
    process.env.STUDIO_UPSTREAM = "http://127.0.0.1:1";
    try {
      const res = await publicApp.fetch(
        new Request("http://test/api/studio", { headers: creatorHeaders })
      );
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "studio_unavailable" });
    } finally {
      delete process.env.STUDIO_UPSTREAM;
    }
  });

  it("lets CORS write headers after a Studio upstream fetch", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    process.env.STUDIO_UPSTREAM = `http://127.0.0.1:${port}`;
    try {
      const res = await publicApp.fetch(
        new Request("http://test/api/studio", {
          headers: { Origin: "https://cinima.app" },
        })
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized" });
      expect(res.headers.get("access-control-allow-origin")).toBe("https://cinima.app");
    } finally {
      delete process.env.STUDIO_UPSTREAM;
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  it("forwards public /api/studio to the Studio process", async () => {
    const { proxyStudio } = await import("../src/lib/studioProxy.js");
    const res = await proxyStudio(
      new Request("http://test/api/studio", { headers: creatorHeaders }),
      {
        upstream: "http://studio.local",
        fetchImpl: (input, init) => {
          const url = typeof input === "string" ? input : input.url;
          return studioApp.fetch(new Request(url, init));
        },
      }
    );
    expect(res.status).toBe(200);
    expect((res.body.totals as { users: number } | undefined)?.users).toBe(2);
  });

  it("logs when Studio upstream cannot be reached", async () => {
    const { proxyStudio } = await import("../src/lib/studioProxy.js");
    const lines: unknown[][] = [];
    const res = await proxyStudio(
      new Request("http://test/api/studio", { headers: creatorHeaders }),
      {
        upstream: "http://studio.local",
        fetchImpl: async () => {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8788");
        },
        log: (...args: unknown[]) => {
          lines.push(args);
        },
      }
    );
    expect(res.status).toBe(502);
    expect(lines[0]?.[0]).toBe("[studio-proxy]");
    expect(String(lines[0]?.[1])).toMatch(/ECONNREFUSED/);
  });

  it("returns the Studio snapshot only to the Creator", async () => {
    const res = await studioApp.fetch(
      new Request("http://test/api/studio", { headers: creatorHeaders })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totals: {
        users: number;
        signedUpToday: number;
        activeToday: number;
        activeMsToday: number;
        searchesToday: number;
        viewsToday: number;
        shares: number;
        sharesToday: number;
        follows: number;
        followsToday: number;
        favorites: number;
        recommends: number;
      };
      recentSignups: { handle: string | null; walletAddress: string }[];
      recentSearches: { query: string; handle: string | null }[];
      recentViews: { titleId: string; title: string | null }[];
      recentShares: { kind: string; title: string | null }[];
      recentFollows: {
        follower: { handle: string | null };
        followee: { handle: string | null };
      }[];
      topSearches: { query: string; count: number }[];
      topViews: { titleId: string; count: number }[];
      topShares: { titleId: string; count: number }[];
      people: { handle: string | null; activeMs7d: number }[];
    };
    expect(body.totals.users).toBe(2);
    expect(body.totals.signedUpToday).toBeGreaterThanOrEqual(2);
    expect(body.totals.activeToday).toBeGreaterThanOrEqual(1);
    expect(body.totals.activeMsToday).toBe(45_000);
    expect(body.totals.searchesToday).toBe(1);
    expect(body.totals.viewsToday).toBe(1);
    expect(body.totals.shares).toBe(1);
    expect(body.totals.sharesToday).toBe(1);
    expect(body.totals.follows).toBe(1);
    expect(body.totals.followsToday).toBe(1);
    expect(body.totals.favorites).toBe(1);
    expect(body.totals.recommends).toBe(1);
    expect(body.recentSearches[0]?.query).toBe("dune");
    expect(body.recentSearches[0]?.handle).toBe("peer");
    expect(body.recentViews[0]?.titleId).toBe(MOVIE_ID);
    expect(body.recentViews[0]?.title).toBe("Fight Club");
    expect(body.recentShares[0]?.kind).toBe("title");
    expect(body.recentShares[0]?.title).toBe("Fight Club");
    expect(body.recentFollows[0]?.follower.handle).toBe("peer");
    expect(body.recentFollows[0]?.followee.handle).toBe("cinima");
    expect(body.topSearches).toEqual([{ query: "dune", count: 1 }]);
    expect(body.topViews[0]).toEqual({
      titleId: MOVIE_ID,
      title: "Fight Club",
      count: 1,
    });
    expect(body.people.some((p) => p.handle === "peer" && p.activeMs7d === 45_000)).toBe(
      true
    );
  });
});
