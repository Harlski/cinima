import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CREATOR_WALLET } from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-share-visits-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const OTHER = "NQ05SHAREVISITOTHERWALLET00000001";
const CREATOR_TOKEN = "test-session-token-share-visits-creator";
const MOVIE_ID = "tmdb:movie:550";
const SHARE_CODE = "abc123xy";

describe("Share visit HTTP API", () => {
  let studioApp: { fetch: (request: Request) => Response | Promise<Response> };
  let publicApp: { fetch: (request: Request) => Response | Promise<Response> };

  const creatorHeaders = {
    Authorization: `Bearer ${CREATOR_TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();

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
    await db.insert(schema.sessions).values({
      token: CREATOR_TOKEN,
      walletAddress: CREATOR_WALLET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
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
    await db.insert(schema.shareLinks).values({
      code: SHARE_CODE,
      kind: "title",
      handle: "peer",
      mediaType: "movie",
      tmdbId: 550,
      walletAddress: OTHER,
      createdAt: now,
    });

    studioApp = (await import("../src/studio.js")).studioApp;
    publicApp = (await import("../src/app.js")).app;
  });

  async function studioSnapshot() {
    const res = await studioApp.fetch(
      new Request("http://test/api/studio", { headers: creatorHeaders })
    );
    expect(res.status).toBe(200);
    return (await res.json()) as {
      totals: { visits: number; visitsToday: number };
      recentShares: {
        kind: string;
        webCount: number;
        payCount: number;
        payCtaCount: number;
      }[];
    };
  }

  it("records an unauthenticated Share visit and shows web vs Pay stats in Studio", async () => {
    const res = await publicApp.fetch(
      new Request("http://test/api/share-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "title",
          code: SHARE_CODE,
          handle: "peer",
          channel: "web",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const body = await studioSnapshot();
    expect(body.totals.visits).toBe(1);
    expect(body.totals.visitsToday).toBe(1);
    expect(body.recentShares[0]).toMatchObject({
      kind: "title",
      webCount: 1,
      payCount: 0,
      payCtaCount: 0,
    });
  });

  it("records a Pay open and a Pay intent on the same share link", async () => {
    const payOpen = await publicApp.fetch(
      new Request("http://test/api/share-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "title",
          code: SHARE_CODE,
          handle: "peer",
          channel: "pay",
        }),
      })
    );
    expect(payOpen.status).toBe(200);

    const payCta = await publicApp.fetch(
      new Request("http://test/api/share-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "title",
          code: SHARE_CODE,
          handle: "peer",
          channel: "web",
          intent: "pay_cta",
        }),
      })
    );
    expect(payCta.status).toBe(200);
    expect(await payCta.json()).toEqual({ ok: true });

    const body = await studioSnapshot();
    expect(body.recentShares[0]).toMatchObject({
      kind: "title",
      webCount: 1,
      payCount: 1,
      payCtaCount: 1,
    });
    expect(body.totals.visits).toBe(2);
    expect(body.totals.visitsToday).toBe(2);
  });

  it("does not count a crawler User-Agent that somehow POSTs", async () => {
    const before = await studioSnapshot();
    const res = await publicApp.fetch(
      new Request("http://test/api/share-visits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Twitterbot/1.0",
        },
        body: JSON.stringify({
          kind: "profile",
          handle: "peer",
          channel: "web",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const after = await studioSnapshot();
    expect(after.totals.visits).toBe(before.totals.visits);
    expect(after.recentShares[0]?.webCount).toBe(before.recentShares[0]?.webCount);
  });

  it("rejects an invalid Share visit body", async () => {
    const res = await publicApp.fetch(
      new Request("http://test/api/share-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "landing", channel: "web" }),
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("accepts a Watchlist Share visit kind", async () => {
    const res = await publicApp.fetch(
      new Request("http://test/api/share-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "watchlist",
          handle: "peer",
          channel: "web",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const body = await studioSnapshot();
    expect(body.totals.visits).toBe(3);
  });
});
