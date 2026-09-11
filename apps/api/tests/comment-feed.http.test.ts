import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DELETED_COMMENT_LABEL } from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-comment-feed-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const ME = "NQ05COMMENTFEEDME00000000000000001";
const PEER = "NQ05COMMENTFEEDPEER00000000000002";
const TOKEN_ME = "test-session-token-comment-feed-me";
const TOKEN_PEER = "test-session-token-comment-feed-peer";
const MOVIE_ID = "tmdb:movie:550";
const TV_ID = "tmdb:tv:1396";

describe("Comment Feed and Comment Thanks HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  const meHeaders = {
    Authorization: `Bearer ${TOKEN_ME}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  const peerHeaders = {
    Authorization: `Bearer ${TOKEN_PEER}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();
    const older = new Date(now.getTime() - 60_000);

    await db.insert(schema.users).values([
      { walletAddress: ME, handle: "meuser", lifetimeUnlockedAt: null, createdAt: now },
      { walletAddress: PEER, handle: "peeruser", lifetimeUnlockedAt: null, createdAt: now },
    ]);
    await db.insert(schema.sessions).values([
      {
        token: TOKEN_ME,
        walletAddress: ME,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: TOKEN_PEER,
        walletAddress: PEER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
    ]);
    await db.insert(schema.titles).values([
      {
        id: MOVIE_ID,
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
      },
      {
        id: TV_ID,
        mediaType: "tv",
        tmdbId: 1396,
        title: "Breaking Bad",
        year: 2008,
        posterPath: null,
        overview: "fixture",
        imdbId: "tt0903747",
        rating: "9.5",
        fetchedAt: now,
        source: "seed",
      },
    ]);
    await db.insert(schema.favorites).values({
      walletAddress: PEER,
      titleId: MOVIE_ID,
      createdAt: now,
      recommendedAt: null,
    });
    await db.insert(schema.comments).values([
      {
        titleId: MOVIE_ID,
        walletAddress: PEER,
        body: "Still holds up",
        txHash: "",
        createdAt: now,
      },
      {
        titleId: TV_ID,
        walletAddress: ME,
        body: "One more episode",
        txHash: "",
        createdAt: older,
      },
      {
        titleId: MOVIE_ID,
        walletAddress: PEER,
        body: "Gone",
        txHash: "",
        createdAt: older,
        deletedAt: older,
      },
    ]);

    app = (await import("../src/app.js")).app;
  });

  it("lists recent non-deleted Comments from any Handle with Title and Thanks fields", async () => {
    const res = await app.fetch(new Request("http://test/api/comments/feed", { headers: meHeaders }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: {
        id: number;
        body: string;
        walletAddress: string;
        handle: string | null;
        deleted: boolean;
        thanksCount: number;
        thanked: boolean;
        title: { id: string; title: string };
      }[];
    };
    expect(body.items.map((i) => i.body)).toEqual(["Still holds up", "One more episode"]);
    expect(body.items.every((i) => i.deleted === false)).toBe(true);
    expect(body.items[0]).toMatchObject({
      walletAddress: PEER,
      handle: "peeruser",
      thanksCount: 0,
      thanked: false,
      title: { id: MOVIE_ID, title: "Fight Club" },
    });
    expect(body.items[1]).toMatchObject({
      walletAddress: ME,
      handle: "meuser",
      title: { id: TV_ID, title: "Breaking Bad" },
    });
  });

  it("records Comment Thanks once and rejects self and deleted Comments", async () => {
    const feed = await app.fetch(new Request("http://test/api/comments/feed", { headers: meHeaders }));
    const items = ((await feed.json()) as { items: { id: number; body: string }[] }).items;
    const peerCommentId = items.find((i) => i.body === "Still holds up")?.id;
    const ownCommentId = items.find((i) => i.body === "One more episode")?.id;
    expect(peerCommentId).toBeTruthy();
    expect(ownCommentId).toBeTruthy();

    const first = await app.fetch(
      new Request(`http://test/api/comments/${peerCommentId}/thanks`, {
        method: "POST",
        headers: meHeaders,
      })
    );
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      created: boolean;
      comment: { thanksCount: number; thanked: boolean };
    };
    expect(firstBody.created).toBe(true);
    expect(firstBody.comment.thanksCount).toBe(1);
    expect(firstBody.comment.thanked).toBe(true);

    const second = await app.fetch(
      new Request(`http://test/api/comments/${peerCommentId}/thanks`, {
        method: "POST",
        headers: meHeaders,
      })
    );
    expect(second.status).toBe(200);
    expect(((await second.json()) as { created: boolean }).created).toBe(false);

    const selfRes = await app.fetch(
      new Request(`http://test/api/comments/${ownCommentId}/thanks`, {
        method: "POST",
        headers: meHeaders,
      })
    );
    expect(selfRes.status).toBe(400);
    expect(((await selfRes.json()) as { error: string }).error).toBe("cannot_thank_self");

    const list = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(MOVIE_ID)}/comments`, {
        headers: meHeaders,
      })
    );
    const listed = (await list.json()) as {
      comments: {
        id: number;
        body: string;
        thanksCount: number;
        thanked: boolean;
        deleted: boolean;
      }[];
    };
    const live = listed.comments.find((c) => c.body === "Still holds up");
    const gone = listed.comments.find((c) => c.body === DELETED_COMMENT_LABEL);
    expect(live).toMatchObject({ thanksCount: 1, thanked: true });
    expect(gone?.deleted).toBe(true);

    const deletedId = listed.comments.find((c) => c.deleted)?.id;
    const delThanks = await app.fetch(
      new Request(`http://test/api/comments/${deletedId}/thanks`, {
        method: "POST",
        headers: meHeaders,
      })
    );
    expect(delThanks.status).toBe(400);
    expect(((await delThanks.json()) as { error: string }).error).toBe("deleted");
  });

  it("does not treat Comment Thanks as title Thanks", async () => {
    const peerComment = await app.fetch(
      new Request("http://test/api/comments/feed", { headers: meHeaders })
    );
    const id = ((await peerComment.json()) as { items: { id: number; body: string }[] }).items.find(
      (i) => i.body === "Still holds up"
    )?.id;

    await app.fetch(
      new Request(`http://test/api/comments/${id}/thanks`, {
        method: "POST",
        headers: meHeaders,
      })
    );

    const suggestersRes = await app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(MOVIE_ID)}/suggesters`, {
        headers: meHeaders,
      })
    );
    expect(suggestersRes.status).toBe(200);
    const suggesters = (await suggestersRes.json()) as {
      suggesters: { walletAddress: string; thanked: boolean }[];
    };
    expect(suggesters.suggesters.find((s) => s.walletAddress === PEER)?.thanked).not.toBe(true);
  });
});
