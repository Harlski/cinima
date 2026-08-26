import "../src/load-env.js";

import { inArray, or } from "drizzle-orm";
import { db } from "../src/db/index.js";
import {
  comments,
  favorites,
  follows,
  sessions,
  shareLinks,
  thanks,
  unlocks,
  users,
  watchlist,
} from "../src/db/schema.js";
import { DEMO_WALLETS } from "../src/services/demoSocial.js";

const wallets = [...DEMO_WALLETS];

async function main() {
  const walletMatch = inArray(comments.walletAddress, wallets);
  const thanksMatch = or(
    inArray(thanks.fromWallet, wallets),
    inArray(thanks.toWallet, wallets)
  );
  const followsMatch = or(
    inArray(follows.followerWallet, wallets),
    inArray(follows.followeeWallet, wallets)
  );

  const deleted = {
    thanks: (await db.delete(thanks).where(thanksMatch).returning({ id: thanks.id })).length,
    follows: (await db.delete(follows).where(followsMatch).returning()).length,
    comments: (await db.delete(comments).where(walletMatch).returning({ id: comments.id })).length,
    favorites: (await db.delete(favorites).where(inArray(favorites.walletAddress, wallets)).returning()).length,
    watchlist: (await db.delete(watchlist).where(inArray(watchlist.walletAddress, wallets)).returning()).length,
    unlocks: (await db.delete(unlocks).where(inArray(unlocks.walletAddress, wallets)).returning({ id: unlocks.id })).length,
    shareLinks: (await db.delete(shareLinks).where(inArray(shareLinks.walletAddress, wallets)).returning({ code: shareLinks.code })).length,
    sessions: (await db.delete(sessions).where(inArray(sessions.walletAddress, wallets)).returning({ token: sessions.token })).length,
    users: (await db.delete(users).where(inArray(users.walletAddress, wallets)).returning({ walletAddress: users.walletAddress })).length,
  };

  console.log("Removed demo users and related rows:");
  for (const [table, count] of Object.entries(deleted)) {
    console.log(`  ${table}: ${count}`);
  }
  console.log("Wallets:", wallets.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
