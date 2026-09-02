import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-usage-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05USAGETESTWALLET000000000000001";
const TOKEN = "test-session-token-usage";
const MOVIE_ID = "tmdb:movie:550";

describe("Usage write HTTP API", () => {
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
      handle: "usageuser",
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

    app = (await import("../src/app.js")).app;
  });

  it("rejects search usage without a session", async () => {
    const res = await app.fetch(
      new Request("http://test/api/usage/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Cinima-Demo": "1" },
        body: JSON.stringify({ query: "dune" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("records a search query for the signed-in Handle", async () => {
    const res = await app.fetch(
      new Request("http://test/api/usage/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: "  Dune  " }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("does not double-count the same search from the same Handle within the window", async () => {
    const { recordSearch } = await import("../src/services/usage.js");
    const first = await recordSearch(WALLET, "Arrival");
    const second = await recordSearch(WALLET, "arrival");
    expect(first).toEqual({ recorded: true, query: "arrival" });
    expect(second).toEqual({ recorded: false, query: "arrival" });
  });

  it("records a title view", async () => {
    const res = await app.fetch(
      new Request("http://test/api/usage/view", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: MOVIE_ID }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects an invalid title view", async () => {
    const res = await app.fetch(
      new Request("http://test/api/usage/view", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: "nope" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("accumulates Presence across heartbeats in the same gap", async () => {
    const { recordHeartbeat } = await import("../src/services/usage.js");
    const t0 = Date.UTC(2026, 8, 2, 12, 0, 0);
    const first = await recordHeartbeat(WALLET, t0);
    const second = await recordHeartbeat(WALLET, t0 + 30_000);
    expect(first).toEqual({ day: "2026-09-02", activeMs: 0 });
    expect(second).toEqual({ day: "2026-09-02", activeMs: 30_000 });
  });

  it("does not add Presence across a gap longer than 90 seconds", async () => {
    const { recordHeartbeat } = await import("../src/services/usage.js");
    const t0 = Date.UTC(2026, 8, 3, 12, 0, 0);
    await recordHeartbeat(WALLET, t0);
    const later = await recordHeartbeat(WALLET, t0 + 120_000);
    expect(later).toEqual({ day: "2026-09-03", activeMs: 0 });
  });

  it("accepts a heartbeat over HTTP", async () => {
    const res = await app.fetch(
      new Request("http://test/api/usage/heartbeat", {
        method: "POST",
        headers,
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
