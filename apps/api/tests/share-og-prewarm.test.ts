import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  getCachedShareOgImage,
  resetShareOgImageCache,
  shareOgCacheKey,
} from "../src/lib/shareOgCache.js";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-share-og-prewarm-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";
process.env.API_ORIGIN = "https://api.cinima.app";

const WALLET = "NQ05SHAREOGPREWARMTESTWALLET000001";
const TOKEN = "test-session-token-share-og-prewarm";
const TITLE_ID = "tmdb:movie:550";

describe("Share OG prewarm", () => {
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
      handle: "prewarmuser",
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
      id: TITLE_ID,
      mediaType: "movie",
      tmdbId: 550,
      title: "Fight Club",
      year: 1999,
      posterPath: "/poster.jpg",
      overview: "fixture",
      imdbId: "tt0137523",
      rating: "8.4",
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;
  });

  afterEach(() => {
    resetShareOgImageCache();
    vi.restoreAllMocks();
  });

  it("prewarms the title Share OG PNG when a share link is created", async () => {
    const key = shareOgCacheKey("title", "prewarmuser", "movie", 550);
    expect(getCachedShareOgImage(key)).toBeUndefined();

    const created = await app.fetch(
      new Request("http://test/api/share/title", {
        method: "POST",
        headers,
        body: JSON.stringify({ mediaType: "movie", tmdbId: 550 }),
      })
    );
    expect(created.status).toBe(200);

    // Allow background prewarm to finish.
    await new Promise((r) => setTimeout(r, 2500));

    const cached = getCachedShareOgImage(key);
    expect(cached).toBeDefined();
    expect(cached!.length).toBeGreaterThan(500);
    expect(cached!.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    const res = await app.fetch(
      new Request("http://test/api/og/title/prewarmuser/movie/550.png")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("content-length")).toBe(String(cached!.length));
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.equals(cached!)).toBe(true);
  }, 15_000);

  it("prewarms the profile Share OG PNG when a profile share link is created", async () => {
    const key = shareOgCacheKey("profile", "prewarmuser");
    expect(getCachedShareOgImage(key)).toBeUndefined();

    const created = await app.fetch(
      new Request("http://test/api/share/profile", {
        method: "POST",
        headers,
      })
    );
    expect(created.status).toBe(200);

    await new Promise((r) => setTimeout(r, 2500));

    const cached = getCachedShareOgImage(key);
    expect(cached).toBeDefined();
    expect(cached!.length).toBeGreaterThan(500);
  }, 15_000);
});
