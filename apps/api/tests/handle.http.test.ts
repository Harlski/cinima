import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-handle-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;
process.env.DEMO_MODE = "true";

const WALLET = "NQ05HANDLEPROFANETESTWALLET00000001";
const TOKEN = "test-session-token-handle-profane";

describe("Handle HTTP API", () => {
  let app: { fetch: (request: Request) => Response | Promise<Response> };

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "X-Cinima-Demo": "1",
  };

  beforeAll(async () => {
    const migrateMod = await import("../src/db/migrate.js");
    await migrateMod.migrate();
    const db = (await import("../src/db/index.js")).db;
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

    app = (await import("../src/app.js")).app;
  });

  it("rejects profane usernames", async () => {
    const res = await app.fetch(
      new Request("http://test/api/me/handle", {
        method: "POST",
        headers,
        body: JSON.stringify({ handle: "shit_head" }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("handle_profane");
  });

  it("accepts a clean username", async () => {
    const res = await app.fetch(
      new Request("http://test/api/me/handle", {
        method: "POST",
        headers,
        body: JSON.stringify({ handle: "cinephile" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { handle: string } };
    expect(body.user.handle).toBe("cinephile");
  });
});
