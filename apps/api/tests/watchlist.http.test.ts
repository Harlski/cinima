import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-api-"));
const dbFile = path.join(dataDir, "test.db");
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05 TESTWALLET FOR WATCHLIST API TESTS0001";
const TITLE_ID = "movie:99";
const TOKEN = "test-session-token-watchlist-roundtrip";

describe("Watchlist HTTP API", () => {
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
      tmdbId: 99,
      title: "Watchlist Test Movie",
      year: 2025,
      posterPath: null,
      overview: "fixture",
      imdbId: null,
      rating: "7.5",
      fetchedAt: new Date(),
      source: "seed",
    });

    const appMod = await import("../src/app.js");
    app = appMod.app;
  });

  it("user can add to watchlist, list it on Me, then remove", async () => {
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Cinima-Demo": "1",
    };

    const addRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(addRes.status).toBe(200);

    const listRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { items: { id: string }[] };
    expect(listBody.items.map((item) => item.id)).toContain(TITLE_ID);

    const meRes = await app.fetch(new Request("http://test/api/me", { headers }));
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { watchlist: { id: string }[] };
    expect(me.watchlist.map((item) => item.id)).toContain(TITLE_ID);

    const titleRes = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}`, { headers })
    );
    expect(titleRes.status).toBe(200);
    const title = (await titleRes.json()) as { watchlisted: boolean };
    expect(title.watchlisted).toBe(true);

    const delRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
      })
    );
    expect(delRes.status).toBe(200);

    const afterRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    const afterBody = (await afterRes.json()) as { items: { id: string }[] };
    expect(afterBody.items.map((item) => item.id)).not.toContain(TITLE_ID);
  });
});
