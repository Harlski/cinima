import { normalizeWallet, type SessionUser } from "@cinima/shared";
import { and, count, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { authNonces, favorites, sessions, users } from "../db/schema.js";
import { config } from "../lib/config.js";

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createChallenge() {
  const nonce = nanoid(24);
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await db.insert(authNonces).values({ nonce, expiresAt, used: false });
  return {
    nonce,
    message: `Cinima:v1:${nonce}`,
    expiresAt: expiresAt.getTime(),
  };
}

export async function ensureUser(walletRaw: string) {
  const walletAddress = normalizeWallet(walletRaw);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);
  if (existing) return existing;
  const now = new Date();
  await db.insert(users).values({
    walletAddress,
    handle: null,
    lifetimeUnlockedAt: null,
    createdAt: now,
  });
  const [created] = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);
  return created!;
}

export async function buildSessionUser(walletRaw: string): Promise<SessionUser> {
  const user = await ensureUser(walletRaw);
  const [fav] = await db
    .select({ c: count() })
    .from(favorites)
    .where(eq(favorites.walletAddress, user.walletAddress));
  return {
    walletAddress: user.walletAddress,
    handle: user.handle,
    lifetimeUnlocked: user.lifetimeUnlockedAt != null,
    favoriteCount: Number(fav?.c ?? 0),
  };
}

/**
 * Verify wallet session.
 * Production: expect valid signature bytes (Ed25519 over message) — verify when crypto bindings available.
 * Demo / Cycle-2 local: accept demoWallet when DEMO_MODE, or any presented public key + signature shapes.
 */
export async function verifyAndCreateSession(input: {
  nonce: string;
  message: string;
  signerPublicKey: string;
  signature: string;
  demoWallet?: string;
  walletAddress?: string;
}): Promise<{ token: string; user: SessionUser }> {
  const [nonceRow] = await db
    .select()
    .from(authNonces)
    .where(and(eq(authNonces.nonce, input.nonce), eq(authNonces.used, false)))
    .limit(1);

  if (!nonceRow || nonceRow.expiresAt.getTime() < Date.now()) {
    throw new Error("invalid_or_expired_nonce");
  }
  if (input.message !== `Cinima:v1:${input.nonce}`) {
    throw new Error("message_mismatch");
  }

  let wallet: string;
  if (config.demoMode && input.demoWallet) {
    wallet = normalizeWallet(input.demoWallet);
  } else if (input.walletAddress && input.signerPublicKey && input.signature) {
    wallet = normalizeWallet(input.walletAddress);
  } else if (!input.signerPublicKey || !input.signature) {
    throw new Error("missing_signature");
  } else {
    // Derive a stable pseudo-address from public key when full Nimiq crypto not linked.
    // Real Pay deploys should replace with @nimiq/core Address.fromPublicKey.
    const pub = input.signerPublicKey.replace(/\s+/g, "");
    wallet = normalizeWallet(deriveDemoAddress(pub));
  }

  await db.update(authNonces).set({ used: true }).where(eq(authNonces.nonce, input.nonce));

  const user = await buildSessionUser(wallet);
  const token = nanoid(40);
  const now = new Date();
  await db.insert(sessions).values({
    token,
    walletAddress: user.walletAddress,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
  });

  return { token, user };
}

function deriveDemoAddress(publicKeyB64OrHex: string): string {
  // Produce NQxx-looking compact address-ish string for sessions outside Pay crypto path.
  let hash = 0;
  for (let i = 0; i < publicKeyB64OrHex.length; i++) {
    hash = (hash * 31 + publicKeyB64OrHex.charCodeAt(i)) >>> 0;
  }
  const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVXY";
  let out = "NQ";
  let n = hash;
  for (let i = 0; i < 32; i++) {
    n = (n * 1664525 + 1013904223) >>> 0;
    out += alphabet[n % alphabet.length];
  }
  return out;
}

export async function sessionFromToken(token: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  const now = new Date();
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  return buildSessionUser(row.walletAddress);
}

export async function setUserHandle(wallet: string, handle: string) {
  const cleaned = handle.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) throw new Error("invalid_handle");
  await ensureUser(wallet);
  await db
    .update(users)
    .set({ handle: cleaned })
    .where(eq(users.walletAddress, normalizeWallet(wallet)));
  return buildSessionUser(wallet);
}

export async function markLifetimeUnlocked(wallet: string) {
  await ensureUser(wallet);
  await db
    .update(users)
    .set({ lifetimeUnlockedAt: new Date() })
    .where(eq(users.walletAddress, normalizeWallet(wallet)));
}
