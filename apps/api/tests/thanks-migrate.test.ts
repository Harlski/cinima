import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(tmpdir(), "cinima-thanks-migrate-"));
process.env.DATABASE_URL = `file:${path.join(dataDir, "test.db")}`;

describe("Thanks unique index migration", () => {
  it("deduplicates existing Thanks before creating the unique index", async () => {
    const { client } = await import("../src/db/index.js");
    await client.execute(`CREATE TABLE IF NOT EXISTS thanks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_wallet TEXT NOT NULL,
      to_wallet TEXT NOT NULL,
      title_id TEXT NOT NULL,
      tip_tx_hash TEXT,
      created_at INTEGER NOT NULL
    )`);

    const now = Date.now();
    for (const createdAt of [now, now + 1, now + 2]) {
      await client.execute({
        sql: `INSERT INTO thanks (from_wallet, to_wallet, title_id, created_at) VALUES (?, ?, ?, ?)`,
        args: ["NQ05FROMWALLET0000000000000000001", "NQ05TOWALLET000000000000000000001", "tmdb:movie:278", createdAt],
      });
    }
    await client.execute({
      sql: `INSERT INTO thanks (from_wallet, to_wallet, title_id, created_at) VALUES (?, ?, ?, ?)`,
      args: ["NQ05FROMWALLET0000000000000000001", "NQ05OTHERPEER0000000000000000001", "tmdb:movie:278", now],
    });

    const { migrate } = await import("../src/db/migrate.js");
    await expect(migrate()).resolves.toBeUndefined();

    const grouped = await client.execute(
      `SELECT from_wallet, to_wallet, title_id, COUNT(*) AS n FROM thanks GROUP BY from_wallet, to_wallet, title_id`
    );
    expect(grouped.rows).toHaveLength(2);
    expect(grouped.rows.every((row) => Number(row.n) === 1)).toBe(true);

    await expect(
      client.execute({
        sql: `INSERT INTO thanks (from_wallet, to_wallet, title_id, created_at) VALUES (?, ?, ?, ?)`,
        args: ["NQ05FROMWALLET0000000000000000001", "NQ05TOWALLET000000000000000000001", "tmdb:movie:278", now + 3],
      })
    ).rejects.toThrow(/UNIQUE constraint failed: thanks\.from_wallet, thanks\.to_wallet, thanks\.title_id/);
  });
});
