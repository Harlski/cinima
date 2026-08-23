import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDb = path.resolve(__dirname, "../../data/cinima.db");

function resolveUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return `file:${defaultDb}`;
  if (raw.startsWith("file:./") || raw.startsWith("file:../")) {
    const rel = raw.slice("file:".length);
    return `file:${path.resolve(process.cwd(), rel)}`;
  }
  if (raw.startsWith("file:") && !raw.startsWith("file:/") && !raw.startsWith("file::")) {
    return `file:${path.resolve(process.cwd(), raw.slice(5))}`;
  }
  return raw;
}

function resolveAuthToken(): string | undefined {
  const token = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  return token || undefined;
}

export const client = createClient({
  url: resolveUrl(),
  authToken: resolveAuthToken(),
});
export const db = drizzle(client, { schema });
