import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  walletAddress: text("wallet_address").primaryKey(),
  handle: text("handle"),
  lifetimeUnlockedAt: integer("lifetime_unlocked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const authNonces = sqliteTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
});

export const titles = sqliteTable(
  "titles",
  {
    id: text("id").primaryKey(),
    mediaType: text("media_type").notNull(), // movie | tv
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    posterPath: text("poster_path"),
    overview: text("overview"),
    imdbId: text("imdb_id"),
    imdbRating: text("imdb_rating"),
    tmdbRating: text("tmdb_rating"),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
    source: text("source").notNull().default("seed"),
  },
  (t) => [uniqueIndex("titles_media_type_tmdb").on(t.mediaType, t.tmdbId)]
);

export const episodes = sqliteTable(
  "episodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titleId: text("title_id").notNull(),
    season: integer("season").notNull(),
    episode: integer("episode").notNull(),
    name: text("name"),
    imdbRating: text("imdb_rating"),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("episodes_unique").on(t.titleId, t.season, t.episode),
    index("episodes_title").on(t.titleId),
  ]
);

export const ratingSnapshots = sqliteTable("rating_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titleId: text("title_id").notNull(),
  source: text("source").notNull(),
  rating: text("rating"),
  rawJson: text("raw_json"),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
});

export const favorites = sqliteTable(
  "favorites",
  {
    walletAddress: text("wallet_address").notNull(),
    titleId: text("title_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("favorites_unique").on(t.walletAddress, t.titleId)]
);

export const unlocks = sqliteTable(
  "unlocks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    walletAddress: text("wallet_address").notNull(),
    titleId: text("title_id").notNull(),
    txHash: text("tx_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("unlocks_unique").on(t.walletAddress, t.titleId)]
);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titleId: text("title_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  body: text("body").notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const thanks = sqliteTable("thanks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromWallet: text("from_wallet").notNull(),
  toWallet: text("to_wallet").notNull(),
  titleId: text("title_id").notNull(),
  tipTxHash: text("tip_tx_hash"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const follows = sqliteTable(
  "follows",
  {
    followerWallet: text("follower_wallet").notNull(),
    followeeWallet: text("followee_wallet").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("follows_unique").on(t.followerWallet, t.followeeWallet),
    index("follows_follower").on(t.followerWallet),
    index("follows_followee").on(t.followeeWallet),
  ]
);