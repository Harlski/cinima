import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-achievements-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";
process.env.WEB_ORIGIN = "https://cinima.app";

const WALLET = "NQ05ACHIEVEMENTTESTWALLET000000001";
const PEER = "NQ05ACHIEVEMENTPEERWALLET0000000001";
const TOKEN = "test-session-token-achievements";
const TITLE_ID = "movie:550";

describe("Achievement HTTP API", () => {
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
    await db.insert(schema.users).values([
      { walletAddress: WALLET, handle: "star", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER, handle: "peer", lifetimeUnlockedAt: null, createdAt: now },
    ]);
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
      imdbId: null,
      rating: "8.4",
      fetchedAt: now,
      source: "seed",
    });
    await db.insert(schema.favorites).values({
      walletAddress: WALLET,
      titleId: TITLE_ID,
      createdAt: now,
      recommendedAt: null,
    });
    await db.insert(schema.favorites).values({
      walletAddress: PEER,
      titleId: TITLE_ID,
      createdAt: now,
      recommendedAt: null,
    });
    app = (await import("../src/app.js")).app;
  });

  it("awards Opening night on the first Recommend and exposes count on Public Profile", async () => {
    const rec = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(rec.status).toBe(200);
    const recBody = (await rec.json()) as { earnedAchievements: string[] };
    expect(recBody.earnedAchievements).toEqual(["opening-night"]);

    const again = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    const againBody = (await again.json()) as { earnedAchievements?: string[] };
    expect(againBody.earnedAchievements || []).not.toContain("opening-night");

    const pub = await app.fetch(new Request("http://test/api/public/star"));
    const profile = (await pub.json()) as { achievementCount: number };
    expect(profile.achievementCount).toBe(1);

    const credits = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(WALLET)}/credits`, { headers })
    );
    expect(credits.status).toBe(200);
    const creditBody = (await credits.json()) as { achievements: { kind: string }[] };
    expect(creditBody.achievements.map((a) => a.kind)).toContain("opening-night");
  });

  it("awards Bravo when sending Thanks and Encore for the thankee on next Me", async () => {
    const thanks = await app.fetch(
      new Request("http://test/api/thanks", {
        method: "POST",
        headers,
        body: JSON.stringify({ toWallet: PEER, titleId: TITLE_ID }),
      })
    );
    expect(thanks.status).toBe(200);
    const body = (await thanks.json()) as { earnedAchievements: string[] };
    expect(body.earnedAchievements).toContain("bravo");

    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    await db.insert(schema.sessions).values({
      token: "peer-token",
      walletAddress: PEER,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
    const me = await app.fetch(
      new Request("http://test/api/me", {
        headers: {
          Authorization: "Bearer peer-token",
          "X-Cinima-Demo": "1",
        },
      })
    );
    const meBody = (await me.json()) as { unseenAchievements: string[] };
    expect(meBody.unseenAchievements).toContain("encore");
  });

  it("awards That's a wrap once when the Guided tour completes", async () => {
    const done = await app.fetch(
      new Request("http://test/api/tour/complete", {
        method: "POST",
        headers,
      })
    );
    expect(done.status).toBe(200);
    const body = (await done.json()) as { earnedAchievements: string[] };
    expect(body.earnedAchievements).toContain("thats-a-wrap");

    const again = await app.fetch(
      new Request("http://test/api/tour/complete", {
        method: "POST",
        headers,
      })
    );
    const againBody = (await again.json()) as { earnedAchievements?: string[] };
    expect(againBody.earnedAchievements || []).not.toContain("thats-a-wrap");
  });
});
