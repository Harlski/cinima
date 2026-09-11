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
const FINISHER = "NQ05ACHIEVEMENTFINISHERWALLET00001";
const TOKEN = "test-session-token-achievements";
const PEER_TOKEN = "peer-token";
const FINISHER_TOKEN = "finisher-token";
const TITLE_ID = "movie:550";

describe("Achievement HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  const peerHeaders = {
    Authorization: `Bearer ${PEER_TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  const finisherHeaders = {
    Authorization: `Bearer ${FINISHER_TOKEN}`,
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
      { walletAddress: FINISHER, handle: "wrap", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values([
      {
        token: TOKEN,
        walletAddress: WALLET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: PEER_TOKEN,
        walletAddress: PEER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: FINISHER_TOKEN,
        walletAddress: FINISHER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
    ]);
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
    await db.insert(schema.favorites).values([
      {
        walletAddress: WALLET,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: null,
      },
      {
        walletAddress: PEER,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: null,
      },
      {
        walletAddress: FINISHER,
        titleId: TITLE_ID,
        createdAt: now,
        recommendedAt: null,
      },
    ]);
    app = (await import("../src/app.js")).app;
  });

  it("does not award Opening night before the Guided tour is skipped or completed", async () => {
    const rec = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers,
      })
    );
    expect(rec.status).toBe(200);
    const recBody = (await rec.json()) as { earnedAchievements: string[] };
    expect(recBody.earnedAchievements || []).toEqual([]);

    const pub = await app.fetch(new Request("http://test/api/public/star"));
    const profile = (await pub.json()) as { achievementCount: number };
    expect(profile.achievementCount).toBe(0);
  });

  it("awards Opening night when the tour is skipped after a Recommend", async () => {
    const skip = await app.fetch(
      new Request("http://test/api/tour/skip", {
        method: "POST",
        headers,
      })
    );
    expect(skip.status).toBe(200);
    const skipBody = (await skip.json()) as { earnedAchievements: string[] };
    expect(skipBody.earnedAchievements).toEqual(["opening-night"]);

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

  it("awards Bravo when sending Thanks and Encore for the thankee after they skip", async () => {
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

    const peerMeBefore = await app.fetch(new Request("http://test/api/me", { headers: peerHeaders }));
    const beforeBody = (await peerMeBefore.json()) as { unseenAchievements: string[] };
    expect(beforeBody.unseenAchievements || []).not.toContain("encore");

    const peerSkip = await app.fetch(
      new Request("http://test/api/tour/skip", {
        method: "POST",
        headers: peerHeaders,
      })
    );
    const peerSkipBody = (await peerSkip.json()) as { earnedAchievements: string[] };
    expect(peerSkipBody.earnedAchievements).toContain("encore");
  });

  it("awards That's a wrap first, then Opening night, when the tour completes after a Recommend", async () => {
    const rec = await app.fetch(
      new Request(`http://test/api/recommends/${encodeURIComponent(TITLE_ID)}`, {
        method: "POST",
        headers: finisherHeaders,
      })
    );
    expect(rec.status).toBe(200);
    const recBody = (await rec.json()) as { earnedAchievements?: string[] };
    expect(recBody.earnedAchievements || []).toEqual([]);

    const done = await app.fetch(
      new Request("http://test/api/tour/complete", {
        method: "POST",
        headers: finisherHeaders,
      })
    );
    expect(done.status).toBe(200);
    const body = (await done.json()) as { earnedAchievements: string[] };
    expect(body.earnedAchievements).toEqual(["thats-a-wrap", "opening-night"]);

    const again = await app.fetch(
      new Request("http://test/api/tour/complete", {
        method: "POST",
        headers: finisherHeaders,
      })
    );
    const againBody = (await again.json()) as { earnedAchievements?: string[] };
    expect(againBody.earnedAchievements || []).not.toContain("thats-a-wrap");
  });
});
