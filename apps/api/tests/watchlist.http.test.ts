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

  it("records an optional Watchlist leave reason and rejects unknown reasons", async () => {
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

    const bad = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ reason: "watched" }),
      })
    );
    expect(bad.status).toBe(400);

    const stillThere = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(
      ((await stillThere.json()) as { items: { id: string }[] }).items.map((item) => item.id)
    ).toContain(TITLE_ID);

    const delRes = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ reason: "finished" }),
      })
    );
    expect(delRes.status).toBe(200);
    expect(((await delRes.json()) as { ok: boolean; removed: boolean }).removed).toBe(true);

    const afterRes = await app.fetch(new Request("http://test/api/watchlist", { headers }));
    expect(
      ((await afterRes.json()) as { items: { id: string }[] }).items.map((item) => item.id)
    ).not.toContain(TITLE_ID);

    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const { eq } = await import("drizzle-orm");
    const leaves = await db
      .select()
      .from(schema.watchlistLeaves)
      .where(eq(schema.watchlistLeaves.titleId, TITLE_ID));
    expect(leaves.some((row) => row.reason === "finished")).toBe(true);
    const leaveCount = leaves.length;

    const noop = await app.fetch(
      new Request(`http://test/api/watchlist/${encodeURIComponent(TITLE_ID)}`, {
        method: "DELETE",
        headers,
      })
    );
    expect(noop.status).toBe(200);
    expect(((await noop.json()) as { removed: boolean }).removed).toBe(false);
    const leavesAfterNoop = await db
      .select()
      .from(schema.watchlistLeaves)
      .where(eq(schema.watchlistLeaves.titleId, TITLE_ID));
    expect(leavesAfterNoop).toHaveLength(leaveCount);
  });
});
