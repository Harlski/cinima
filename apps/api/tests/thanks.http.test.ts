import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-thanks-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05THANKSTESTWALLETME00000000001";
const PEER_A = "NQ05THANKSTESTWALLETPEERAA000001";
const PEER_B = "NQ05THANKSTESTWALLETPEERBB000001";
const TOKEN = "test-session-token-thanks";
const TITLE_ID = "tmdb:movie:550";

describe("Thanks HTTP API", () => {
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
      { walletAddress: ME, handle: "meuser", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER_A, handle: "peera", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER_B, handle: "peerb", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: ME,
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
      imdbId: "tt0137523",
      rating: "8.4",
      fetchedAt: now,
      source: "seed",
    });
    await db.insert(schema.favorites).values([
      { walletAddress: PEER_A, titleId: TITLE_ID, createdAt: now, recommendedAt: null },
      { walletAddress: PEER_B, titleId: TITLE_ID, createdAt: now, recommendedAt: null },
    ]);

    app = (await import("../src/app.js")).app;
  });

  it("rejects thanking yourself", async () => {
    const res = await app.fetch(
      new Request("http://test/api/thanks", {
        method: "POST",
        headers,
        body: JSON.stringify({ toWallet: ME, titleId: TITLE_ID }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("cannot_thank_self");
  });

  it("records Thanks once per peer and title", async () => {
    const first = await app.fetch(
      new Request("http://test/api/thanks", {
        method: "POST",
        headers,
        body: JSON.stringify({ toWallet: PEER_A, titleId: TITLE_ID }),
      })
    );
    expect(first.status).toBe(200);
    expect(((await first.json()) as { created: boolean }).created).toBe(true);

    const second = await app.fetch(
      new Request("http://test/api/thanks", {
        method: "POST",
        headers,
        body: JSON.stringify({ toWallet: PEER_A, titleId: TITLE_ID }),
      })
    );
    expect(second.status).toBe(200);
    expect(((await second.json()) as { created: boolean }).created).toBe(false);

    const suggestersRes = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}/suggesters`, { headers })
    );
    expect(suggestersRes.status).toBe(200);
    const suggesters = (await suggestersRes.json()) as {
      suggesters: { walletAddress: string; thanked: boolean }[];
    };
    const peerA = suggesters.suggesters.find((s) => s.walletAddress === PEER_A);
    const peerB = suggesters.suggesters.find((s) => s.walletAddress === PEER_B);
    expect(peerA?.thanked).toBe(true);
    expect(peerB?.thanked).toBe(false);
  });

  it("Thank all covers remaining peers and is idempotent", async () => {
    const first = await app.fetch(
      new Request("http://test/api/thanks/all", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: TITLE_ID }),
      })
    );
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { ok: boolean; thanked: number };
    expect(firstBody.ok).toBe(true);
    expect(firstBody.thanked).toBe(1);

    const second = await app.fetch(
      new Request("http://test/api/thanks/all", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: TITLE_ID }),
      })
    );
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { ok: boolean; thanked: number };
    expect(secondBody.thanked).toBe(0);

    const suggestersRes = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(TITLE_ID)}/suggesters`, { headers })
    );
    const suggesters = (await suggestersRes.json()) as {
      suggesters: { walletAddress: string; thanked: boolean }[];
    };
    expect(suggesters.suggesters).toHaveLength(2);
    expect(suggesters.suggesters.every((s) => s.thanked)).toBe(true);
  });
});
