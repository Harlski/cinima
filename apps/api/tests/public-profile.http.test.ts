import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-public-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";

const WALLET = "NQ05PUBLICPROFILETESTWALLET0000001";
const TOKEN = "test-session-token-public-profile";
const TITLE_ID = "tmdb:movie:550";
const IMDB_ID = "tt0137523";

describe("Public Profile HTTP API", () => {
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
      handle: "pubuser",
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
      posterPath: null,
      overview: "fixture",
      imdbId: IMDB_ID,
      rating: "8.4",
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;

    const fav = await app.fetch(
      new Request(`http://test/api/favorites/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(fav.status).toBe(200);
  });

  it("public profile title summaries include IMDb id when known", async () => {
    const res = await app.fetch(new Request("http://test/api/public/pubuser"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      handle: string;
      favorites: { id: string; imdbId: string | null }[];
    };
    expect(body.handle).toBe("pubuser");
    const row = body.favorites.find((t) => t.id === TITLE_ID);
    expect(row?.imdbId).toBe(IMDB_ID);
  });

  it("user can set an X handle and see it on the public profile", async () => {
    const bad = await app.fetch(
      new Request("http://test/api/me/x-handle", {
        method: "POST",
        headers,
        body: JSON.stringify({ xHandle: "not a handle!!!" }),
      })
    );
    expect(bad.status).toBe(400);

    const setRes = await app.fetch(
      new Request("http://test/api/me/x-handle", {
        method: "POST",
        headers,
        body: JSON.stringify({ xHandle: "@Cinephile" }),
      })
    );
    expect(setRes.status).toBe(200);
    const setBody = (await setRes.json()) as { xHandle: string | null };
    expect(setBody.xHandle).toBe("Cinephile");

    const pub = await app.fetch(new Request("http://test/api/public/pubuser"));
    const body = (await pub.json()) as { xHandle: string | null };
    expect(body.xHandle).toBe("Cinephile");
  });

  it("returns Open Graph HTML when the client asks for HTML", async () => {
    const res = await app.fetch(
      new Request("http://test/api/public/pubuser", {
        headers: { Accept: "text/html" },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") || "").toContain("text/html");
    const html = await res.text();
    expect(html).toContain("pubuser on Cinima");
    expect(html).toContain(
      "Check out pubuser's favorite movies &amp; tv shows on Cinima.app"
    );
    expect(html).toContain('property="og:site_name" content="Cinima"');
    expect(html).toContain("https://cinima.app/pubuser");
    expect(html).toContain("og:image");
    expect(html).toContain("/api/og/profile/pubuser.png");
  });
});
