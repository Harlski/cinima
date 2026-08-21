import { and, eq } from "drizzle-orm";
import { makeTitleId } from "@nimcharts/shared";
import { db } from "../db/index.js";
import { favorites, follows, users } from "../db/schema.js";

/** Seed a small social graph so taste-overlap + follow feed + heatmap are demoable */
export async function seedDemoSocialGraph() {
  const now = Date.now();
  const peers = [
    {
      wallet: "NQ01PEERAAAAOVERLAPDEMOWALLET00001",
      handle: "cinephile",
      titles: [
        makeTitleId("movie", 550),
        makeTitleId("movie", 157336),
        makeTitleId("tv", 1396),
        makeTitleId("movie", 278),
        makeTitleId("tv", 94605),
      ],
    },
    {
      wallet: "NQ02PEERBBBBTOASTEOVERLAPWALLET02",
      handle: "nightowl",
      titles: [
        makeTitleId("movie", 550),
        makeTitleId("movie", 238),
        makeTitleId("tv", 1399),
        makeTitleId("movie", 13),
        makeTitleId("tv", 60625),
      ],
    },
  ];

  const demoWallets = [
    "NQ05DEMONIMCHARTSCYCLETWOWALLET0001",
    "NQ05DEMONIMCHARTSCYCLETWOWALLET0001",
  ];

  for (const p of peers) {
    await db
      .insert(users)
      .values({
        walletAddress: p.wallet,
        handle: p.handle,
        lifetimeUnlockedAt: null,
        createdAt: new Date(now - 90 * 86400000),
      })
      .onConflictDoNothing();

    for (let i = 0; i < p.titles.length; i++) {
      const t = p.titles[i]!;
      // Spread activity across recent weeks for a visible heatmap
      const createdAt = new Date(now - (3 + i * 11) * 86400000 - i * 3600000);
      await db
        .insert(favorites)
        .values({ walletAddress: p.wallet, titleId: t, createdAt })
        .onConflictDoNothing();
      await db
        .update(favorites)
        .set({ createdAt })
        .where(and(eq(favorites.walletAddress, p.wallet), eq(favorites.titleId, t)));
    }
  }

  // Auto-follow seeded curators for local demo wallet so Discover feed is populated
  const demo = "NQ05DEMONIMCHARTSCYCLETWOWALLET0001";
  await db
    .insert(users)
    .values({
      walletAddress: demo,
      handle: "demouser",
      lifetimeUnlockedAt: null,
      createdAt: new Date(now - 60 * 86400000),
    })
    .onConflictDoNothing();

  for (const p of peers) {
    await db
      .insert(follows)
      .values({
        followerWallet: demo,
        followeeWallet: p.wallet,
        createdAt: new Date(now - 14 * 86400000),
      })
      .onConflictDoNothing();
  }

  // Some demo-user favorites for their own heatmap (multiple days)
  const mine = [
    makeTitleId("movie", 550),
    makeTitleId("tv", 1396),
    makeTitleId("movie", 278),
    makeTitleId("tv", 1399),
    makeTitleId("movie", 13),
  ];
  for (let i = 0; i < mine.length; i++) {
    const createdAt = new Date(now - (i * 5 + 1) * 86400000);
    await db
      .insert(favorites)
      .values({
        walletAddress: demo,
        titleId: mine[i]!,
        createdAt,
      })
      .onConflictDoNothing();
    await db
      .update(favorites)
      .set({ createdAt })
      .where(and(eq(favorites.walletAddress, demo), eq(favorites.titleId, mine[i]!)));
  }

  void demoWallets;
}
