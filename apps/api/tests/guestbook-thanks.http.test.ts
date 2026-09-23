import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-guestbook-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05GUESTBOOKTESTWALLETME000000001";
const PEER = "NQ05GUESTBOOKTESTWALLETPEER0000001";
const TOKEN = "test-session-token-guestbook";

describe("Guestbook thanks HTTP API", () => {
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
      { walletAddress: ME, handle: "guestbookme", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER, handle: "guestbookpeer", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values({
      token: TOKEN,
      walletAddress: ME,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: now,
    });
    app = (await import("../src/app.js")).app;
  });

  async function peerSession() {
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    await db.insert(schema.sessions).values({
      token: "peer-guestbook-session",
      walletAddress: PEER,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
  }

  it("rejects a free note and leaves the Guestbook empty", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/guestbook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ txHash: "demo:guestbook-free", noteId: "thanks" }),
      })
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_note");

    await peerSession();
    const received = await app.fetch(
      new Request("http://test/api/me/received", {
        headers: { Authorization: "Bearer peer-guestbook-session", "X-Cinima-Demo": "1" },
      })
    );
    const body = (await received.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });

  it("rejects thanking yourself", async () => {
    const res = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(ME)}/guestbook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ txHash: "demo:guestbook-self", noteId: "great-taste" }),
      })
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("cannot_thank_self");
  });

  it("writes a Guestbook thanks only after a paid profile note", async () => {
    const missing = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/guestbook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ noteId: "great-taste" }),
      })
    );
    expect(missing.status).toBe(400);

    const sent = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/guestbook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ txHash: "demo:guestbook-paid", noteId: "great-taste" }),
      })
    );
    expect(sent.status).toBe(200);
    const sentBody = (await sent.json()) as { sendMemo: string; sendTxHash: string };
    expect(sentBody.sendMemo).toBe("You have great taste");
    expect(sentBody.sendTxHash).toBe("demo:guestbook-paid");

    const again = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/guestbook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ txHash: "demo:guestbook-paid-2", noteId: "thanks-cinima" }),
      })
    );
    expect(again.status).toBe(200);

    const replay = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}/guestbook`, {
        method: "POST",
        headers,
        body: JSON.stringify({ txHash: "demo:guestbook-paid", noteId: "great-taste" }),
      })
    );
    expect(replay.status).toBe(409);

    const received = await app.fetch(
      new Request("http://test/api/me/received", {
        headers: { Authorization: "Bearer peer-guestbook-session", "X-Cinima-Demo": "1" },
      })
    );
    const body = (await received.json()) as {
      items: {
        kind: string;
        fromWallet: string;
        sendMemo: string;
        sendNim: number;
        rewardNim: number;
        titleId?: string;
      }[];
    };
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      kind: "guestbook",
      fromWallet: ME,
      sendMemo: "Thanks on Cinima",
      sendNim: 1,
      rewardNim: 0,
    });
    expect(body.items[1]).toMatchObject({
      kind: "guestbook",
      fromWallet: ME,
      sendMemo: "You have great taste",
      sendNim: 1,
      rewardNim: 0,
    });
    expect(body.items[0]?.titleId).toBeUndefined();
  });

  it("shows the newest five on another Handle and the full list to the owner", async () => {
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();
    const extras = ["A", "B", "C", "D", "E"].map((letter, index) => ({
      walletAddress: `NQ05GUESTBOOKEXTRA${letter}0000000000001`,
      handle: `extra${letter.toLowerCase()}`,
      lifetimeUnlockedAt: null,
      createdAt: now,
      token: `extra-${letter}-session`,
      txHash: `demo:guestbook-extra-${letter}`,
      at: new Date(now.getTime() + (index + 1) * 1000),
    }));
    await db.insert(schema.users).values(
      extras.map((row) => ({
        walletAddress: row.walletAddress,
        handle: row.handle,
        lifetimeUnlockedAt: null,
        createdAt: row.createdAt,
      }))
    );
    await db.insert(schema.sessions).values(
      extras.map((row) => ({
        token: row.token,
        walletAddress: row.walletAddress,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      }))
    );

    for (const row of extras) {
      const res = await app.fetch(
        new Request(`http://test/api/users/${encodeURIComponent(PEER)}/guestbook`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${row.token}`,
            "Content-Type": "application/json",
            "X-Cinima-Demo": "1",
          },
          body: JSON.stringify({ txHash: row.txHash, noteId: "thanks-cinima" }),
        })
      );
      expect(res.status).toBe(200);
    }

    const profile = await app.fetch(
      new Request(`http://test/api/users/${encodeURIComponent(PEER)}`, { headers })
    );
    expect(profile.status).toBe(200);
    const profileBody = (await profile.json()) as {
      guestbook: { fromWallet: string; sendMemo: string }[];
    };
    expect(profileBody.guestbook).toHaveLength(5);
    expect(profileBody.guestbook.map((row) => row.fromWallet)).toEqual([
      extras[4]!.walletAddress,
      extras[3]!.walletAddress,
      extras[2]!.walletAddress,
      extras[1]!.walletAddress,
      extras[0]!.walletAddress,
    ]);
    expect(profileBody.guestbook.every((row) => row.sendMemo === "Thanks on Cinima")).toBe(true);

    const owner = await app.fetch(
      new Request("http://test/api/me/received", {
        headers: { Authorization: "Bearer peer-guestbook-session", "X-Cinima-Demo": "1" },
      })
    );
    const ownerBody = (await owner.json()) as { items: { kind: string }[] };
    expect(ownerBody.items.filter((row) => row.kind === "guestbook")).toHaveLength(7);

    const pub = await app.fetch(
      new Request("http://test/api/public/guestbookpeer", { headers: { Accept: "application/json" } })
    );
    expect(pub.status).toBe(200);
    const pubBody = (await pub.json()) as { guestbook?: unknown };
    expect(pubBody.guestbook).toBeUndefined();
  });

  it("includes a Guestbook thanks in the Return digest as its note", async () => {
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const ago = new Date(Date.now() - 5 * 60 * 1000);
    await db.insert(schema.presenceDays).values({
      walletAddress: PEER,
      day: ago.toISOString().slice(0, 10),
      activeMs: 1000,
      lastHeartbeatAt: ago,
    });

    const res = await app.fetch(
      new Request("http://test/api/usage/heartbeat", {
        method: "POST",
        headers: { Authorization: "Bearer peer-guestbook-session", "X-Cinima-Demo": "1" },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      digest: {
        thanksCount: number;
        nimReceived: number;
        thankers: { titles: { titleName: string; nim: number }[] }[];
      } | null;
    };
    expect(body.digest?.thanksCount).toBe(7);
    expect(body.digest?.nimReceived).toBe(7);
    const notes = body.digest?.thankers.flatMap((thanker) => thanker.titles.map((row) => row.titleName));
    expect(notes).toContain("You have great taste");
    expect(notes).toContain("Thanks on Cinima");
  });
});
