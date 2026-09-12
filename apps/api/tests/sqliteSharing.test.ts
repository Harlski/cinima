import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import {
  applySqliteSharingPragmas,
  isSqliteBusy,
  retryOnSqliteBusy,
} from "../src/db/sqlite.js";

function twoClients() {
  const dir = mkdtempSync(path.join(tmpdir(), "cinima-sqlite-share-"));
  const url = `file:${path.join(dir, "t.db")}`;
  return { url, writer: createClient({ url }), reader: createClient({ url }) };
}

describe("Shared SQLite", () => {
  it("cannot SELECT while another process holds an exclusive lock", async () => {
    const { writer, reader } = twoClients();
    await writer.execute("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    await writer.execute("BEGIN EXCLUSIVE");
    await writer.execute("INSERT INTO users VALUES (1)");
    await expect(reader.execute("SELECT * FROM users")).rejects.toMatchObject({
      code: "SQLITE_BUSY",
    });
    await writer.execute("ROLLBACK");
  });

  it("lets a reader SELECT while another process holds an exclusive lock", async () => {
    const { url, writer, reader } = twoClients();
    await applySqliteSharingPragmas(writer, url);
    await applySqliteSharingPragmas(reader, url);
    await writer.execute("CREATE TABLE users (id INTEGER PRIMARY KEY)");
    await writer.execute("BEGIN EXCLUSIVE");
    await writer.execute("INSERT INTO users VALUES (1)");
    const rows = await reader.execute("SELECT * FROM users");
    expect(rows.rows).toEqual([]);
    await writer.execute("ROLLBACK");
  });
});

describe("SQLITE_BUSY", () => {
  it("recognizes the locked-database error from libsql", () => {
    expect(isSqliteBusy({ code: "SQLITE_BUSY", message: "database is locked" })).toBe(true);
    expect(isSqliteBusy(new Error("chain_fail"))).toBe(false);
  });

  it("retries a tick that hits a locked database", async () => {
    let attempts = 0;
    const result = await retryOnSqliteBusy(async () => {
      attempts += 1;
      if (attempts < 3) {
        const err = new Error("SQLITE_BUSY: database is locked") as Error & { code: string };
        err.code = "SQLITE_BUSY";
        throw err;
      }
      return "drained";
    }, [0, 0, 0]);
    expect(result).toBe("drained");
    expect(attempts).toBe(3);
  });
});
