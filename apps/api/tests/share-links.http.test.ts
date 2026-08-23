import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-share-links-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";

const WALLET = "NQ05SHARELINKTESTWALLET00000000001";
const TOKEN = "test-session-token-share-links";
const TITLE_ID = "tmdb:movie:550";

describe("Share links HTTP API", () => {
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
      handle: "linkuser",
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

  it("creates a compact title share link", async () => {
    const res = await app.fetch(
      new Request("http://test/api/share/title", {
        method: "POST",
        headers,
        body: JSON.stringify({ mediaType: "movie", tmdbId: 550 }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string; kind: string };
    expect(body.kind).toBe("title");
    expect(body.code).toMatch(/^[a-z0-9]{8}$/);

    const again = await app.fetch(
      new Request("http://test/api/share/title", {
        method: "POST",
        headers,
        body: JSON.stringify({ mediaType: "movie", tmdbId: 550 }),
      })
    );
    const bodyAgain = (await again.json()) as { code: string };
    expect(bodyAgain.code).toBe(body.code);
  });

  it("resolves a short link as JSON and Open Graph HTML", async () => {
    const created = await app.fetch(
      new Request("http://test/api/share/title", {
        method: "POST",
        headers,
        body: JSON.stringify({ mediaType: "movie", tmdbId: 550 }),
      })
    );
    const { code } = (await created.json()) as { code: string };

    const json = await app.fetch(new Request(`http://test/api/s/${code}`));
    expect(json.status).toBe(200);
    const payload = (await json.json()) as {
      kind: string;
      handle: string;
      title: { title: string };
    };
    expect(payload.kind).toBe("title");
    expect(payload.handle).toBe("linkuser");
    expect(payload.title.title).toBe("Fight Club");

    const html = await app.fetch(
      new Request(`http://test/api/s/${code}`, {
        headers: { Accept: "text/html" },
      })
    );
    expect(html.status).toBe(200);
    const page = await html.text();
    expect(page).toContain(`https://cinima.app/s/${code}`);
    expect(page).toContain("linkuser wants you to check out Fight Club");
    expect(page).toContain("og:image");
  });

  it("returns short profile links from Me", async () => {
    const res = await app.fetch(
      new Request("http://test/api/me", { headers })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { shareUrl: string | null };
    expect(body.shareUrl).toMatch(/^https:\/\/cinima\.app\/s\/[a-z0-9]{8}$/);
  });
});
