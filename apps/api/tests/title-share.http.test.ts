import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-title-share-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";

const WALLET = "NQ05TITLESHARETESTWALLET000000001";
const TITLE_ID = "tmdb:movie:550";
const IMDB_ID = "tt0137523";

describe("Title Share HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();

    await db.insert(schema.users).values({
      walletAddress: WALLET,
      handle: "shareuser",
      lifetimeUnlockedAt: null,
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
      imdbId: IMDB_ID,
      rating: "8.4",
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;
  });

  it("returns handle and title for a public Title Share", async () => {
    const res = await app.fetch(
      new Request("http://test/api/public/shareuser/t/movie/550")
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      handle: string;
      walletAddress: string;
      title: { id: string; title: string; mediaType: string; tmdbId: number };
    };
    expect(body.handle).toBe("shareuser");
    expect(body.walletAddress).toBe(WALLET);
    expect(body.title.id).toBe(TITLE_ID);
    expect(body.title.title).toBe("Fight Club");
    expect(body.title.mediaType).toBe("movie");
    expect(body.title.tmdbId).toBe(550);
  });

  it("returns 404 when the Handle does not exist", async () => {
    const res = await app.fetch(
      new Request("http://test/api/public/nobody/t/movie/550")
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when the Title is not in the catalog", async () => {
    const res = await app.fetch(
      new Request("http://test/api/public/shareuser/t/movie/1")
    );
    expect(res.status).toBe(404);
  });

  it("returns Open Graph HTML when the client asks for HTML", async () => {
    const res = await app.fetch(
      new Request("http://test/api/public/shareuser/t/movie/550", {
        headers: { Accept: "text/html" },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") || "").toContain("text/html");
    const html = await res.text();
    expect(html).toContain("shareuser wants you to check out Fight Club");
    expect(html).toContain('property="og:description" content="shareuser wants you to check out Fight Club"');
    expect(html).toContain('property="og:site_name" content="Cinima"');
    expect(html).toContain("https://cinima.app/shareuser/t/movie/550");
    expect(html).toContain("og:image");
    expect(html).not.toContain('id="app"');
    expect(html).not.toContain('property="og:title" content="Cinima"');
    expect(html).toContain("/api/og/title/shareuser/movie/550.png");
  });
});
