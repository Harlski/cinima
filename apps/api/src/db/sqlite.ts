export const SQLITE_BUSY_TIMEOUT_MS = 8_000;

export function isFileSqliteUrl(url: string): boolean {
  return url.startsWith("file:");
}

export function isSqliteBusy(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  if (e.code === "SQLITE_BUSY") return true;
  return typeof e.message === "string" && /database is locked/i.test(e.message);
}

export async function applySqliteSharingPragmas(
  client: { execute: (sql: string) => Promise<unknown> },
  url: string
): Promise<void> {
  if (!isFileSqliteUrl(url)) return;
  await client.execute(`PRAGMA busy_timeout=${SQLITE_BUSY_TIMEOUT_MS}`);
  await client.execute("PRAGMA journal_mode=WAL");
  await client.execute("PRAGMA synchronous=NORMAL");
}

export async function retryOnSqliteBusy<T>(
  fn: () => Promise<T>,
  delaysMs: number[] = [0, 200, 800, 2000]
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < delaysMs.length; i++) {
    const delay = delaysMs[i];
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isSqliteBusy(err) || i === delaysMs.length - 1) throw err;
    }
  }
  throw last;
}
