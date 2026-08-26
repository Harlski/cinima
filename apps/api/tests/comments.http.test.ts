import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DELETED_COMMENT_LABEL } from "@cinima/shared";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-comments-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const OWNER = "NQ05COMMENTOWNER000000000000000001";
const OTHER = "NQ05COMMENTOTHER00000000000000002";
const TOKEN_OWNER = "test-session-token-comment-owner";
const TOKEN_OTHER = "test-session-token-comment-other";
const MOVIE_ID = "tmdb:movie:4242";

describe("comments edit/delete", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  const ownerHeaders = {
    Authorization: `Bearer ${TOKEN_OWNER}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  const otherHeaders = {
    Authorization: `Bearer ${TOKEN_OTHER}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    await (await import("../src/db/migrate.js")).migrate();
    const { db } = await import("../src/db/index.js");
    const schema = await import("../src/db/schema.js");
    const now = new Date();

    await db.insert(schema.users).values([
      {
        walletAddress: OWNER,
        handle: "commenter",
        lifetimeUnlockedAt: null,
        createdAt: now,
      },
      {
        walletAddress: OTHER,
        handle: "other",
        lifetimeUnlockedAt: null,
        createdAt: now,
      },
    ]);
    await db.insert(schema.sessions).values([
      {
        token: TOKEN_OWNER,
        walletAddress: OWNER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
      {
        token: TOKEN_OTHER,
        walletAddress: OTHER,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: now,
      },
    ]);
    await db.insert(schema.titles).values({
      id: MOVIE_ID,
      mediaType: "movie",
      tmdbId: 4242,
      title: "Comment Movie",
      year: 2024,
      posterPath: null,
      overview: "fixture",
      imdbId: "tt0004242",
      rating: "7.5",
      fetchedAt: now,
      source: "seed",
    });

    app = (await import("../src/app.js")).app;
  });

  async function postComment(body: string, headers = ownerHeaders) {
    return app.fetch(
      new Request("http://test/api/comments", {
        method: "POST",
        headers,
        body: JSON.stringify({ titleId: MOVIE_ID, body }),
      })
    );
  }

  async function listComments(headers = ownerHeaders) {
    return app.fetch(
      new Request(`http://test/api/titles/${encodeURIComponent(MOVIE_ID)}/comments`, {
        headers,
      })
    );
  }

  it("censors profanity when posting", async () => {
    const res = await postComment("What the fuck was that ending");
    expect(res.status).toBe(200);
    const list = await listComments();
    const body = (await list.json()) as {
      comments: { body: string }[];
    };
    expect(body.comments[0]?.body).not.toMatch(/fuck/i);
    expect(body.comments[0]?.body).toMatch(/\*/);
  });

  it("lets the author edit their comment", async () => {
    const post = await postComment("Original take");
    expect(post.status).toBe(200);
    const listed = (await listComments().then((r) => r.json())) as {
      comments: { id: number; body: string; updatedAt: string | null }[];
    };
    const id = listed.comments.find((c) => c.body === "Original take")?.id;
    expect(id).toBeTruthy();

    const patch = await app.fetch(
      new Request(`http://test/api/comments/${id}`, {
        method: "PATCH",
        headers: ownerHeaders,
        body: JSON.stringify({ body: "Updated take" }),
      })
    );
    expect(patch.status).toBe(200);
    const updated = (await patch.json()) as {
      comment: { body: string; updatedAt: string | null };
    };
    expect(updated.comment.body).toBe("Updated take");
    expect(updated.comment.updatedAt).toBeTruthy();
  });

  it("rejects edits from someone else", async () => {
    const post = await postComment("Only mine");
    const listed = (await post.json()) as { comments: { id: number; body: string }[] };
    const id = listed.comments.find((c) => c.body === "Only mine")?.id;
    expect(id).toBeTruthy();

    const patch = await app.fetch(
      new Request(`http://test/api/comments/${id}`, {
        method: "PATCH",
        headers: otherHeaders,
        body: JSON.stringify({ body: "Hijacked" }),
      })
    );
    expect(patch.status).toBe(403);
  });

  it("soft-deletes and marks the comment as deleted by user", async () => {
    const post = await postComment("Delete me");
    const listed = (await post.json()) as { comments: { id: number; body: string }[] };
    const id = listed.comments.find((c) => c.body === "Delete me")?.id;
    expect(id).toBeTruthy();

    const del = await app.fetch(
      new Request(`http://test/api/comments/${id}`, {
        method: "DELETE",
        headers: ownerHeaders,
      })
    );
    expect(del.status).toBe(200);
    const deleted = (await del.json()) as {
      comment: { body: string; deleted: boolean };
    };
    expect(deleted.comment.deleted).toBe(true);
    expect(deleted.comment.body).toBe(DELETED_COMMENT_LABEL);

    const list = await listComments();
    const body = (await list.json()) as {
      comments: { id: number; body: string; deleted: boolean }[];
    };
    const row = body.comments.find((c) => c.id === id);
    expect(row?.deleted).toBe(true);
    expect(row?.body).toBe(DELETED_COMMENT_LABEL);
  });

  it("rejects editing a deleted comment", async () => {
    const post = await postComment("Gone soon");
    const listed = (await post.json()) as { comments: { id: number; body: string }[] };
    const id = listed.comments.find((c) => c.body === "Gone soon")?.id;
    expect(id).toBeTruthy();

    await app.fetch(
      new Request(`http://test/api/comments/${id}`, {
        method: "DELETE",
        headers: ownerHeaders,
      })
    );

    const patch = await app.fetch(
      new Request(`http://test/api/comments/${id}`, {
        method: "PATCH",
        headers: ownerHeaders,
        body: JSON.stringify({ body: "Too late" }),
      })
    );
    expect(patch.status).toBe(400);
  });
});
