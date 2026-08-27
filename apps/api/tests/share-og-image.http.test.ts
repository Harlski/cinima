import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-share-og-http-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";
process.env.API_ORIGIN = "https://api.cinima.app";

const WALLET = "NQ05SHAREOGIMAGETESTWALLET0000001";
const TITLE_ID = "tmdb:tv:46331";

describe("Share OG image HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();

    await db.insert(schema.users).values({
      walletAddress: WALLET,
      handle: "creator",
      lifetimeUnlockedAt: null,
      createdAt: now,
    });
    await db.insert(schema.titles).values({
      id: TITLE_ID,
      mediaType: "tv",
      tmdbId: 46331,
      title: "Under the Dome",
      year: 2013,
      posterPath: "/poster.jpg",
      overview: "fixture",
      imdbId: null,
      rating: "6.5",
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;
  });

  it("serves a title Share preview PNG at the .png URL Facebook scrapes", async () => {
    const res = await app.fetch(
      new Request("http://test/api/og/title/creator/tv/46331.png")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("serves a profile Share preview PNG at the .png URL", async () => {
    const res = await app.fetch(
      new Request("http://test/api/og/profile/creator.png")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(500);
  });
});
