import { client } from "./index.js";

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    wallet_address TEXT PRIMARY KEY,
    handle TEXT,
    x_handle TEXT,
    lifetime_unlocked_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_nonces (
    nonce TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS titles (
    id TEXT PRIMARY KEY,
    media_type TEXT NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    poster_path TEXT,
    overview TEXT,
    imdb_id TEXT,
    rating TEXT,
    popularity REAL,
    fetched_at INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'seed'
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS titles_media_type_tmdb ON titles(media_type, tmdb_id)`,
  `CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    rating TEXT,
    imdb_id TEXT,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS episodes_unique ON episodes(title_id, season, episode)`,
  `CREATE INDEX IF NOT EXISTS episodes_title ON episodes(title_id)`,
  `CREATE TABLE IF NOT EXISTS rating_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    source TEXT NOT NULL,
    rating TEXT,
    raw_json TEXT,
    fetched_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS favorites (
    wallet_address TEXT NOT NULL,
    title_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    recommended_at INTEGER
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique ON favorites(wallet_address, title_id)`,
  `CREATE TABLE IF NOT EXISTS unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    title_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS unlocks_unique ON unlocks(wallet_address, title_id)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    body TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS thanks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_wallet TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    title_id TEXT NOT NULL,
    tip_tx_hash TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_wallet TEXT NOT NULL,
    followee_wallet TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS follows_unique ON follows(follower_wallet, followee_wallet)`,
  `CREATE INDEX IF NOT EXISTS follows_follower ON follows(follower_wallet)`,
  `CREATE INDEX IF NOT EXISTS follows_followee ON follows(followee_wallet)`,
];

export async function migrate() {
  for (const sql of statements) {
    await client.execute(sql);
  }
  try {
    await client.execute(`ALTER TABLE users ADD COLUMN x_handle TEXT`);
  } catch {
    /* column already exists */
  }
  try {
    await client.execute(`ALTER TABLE favorites ADD COLUMN recommended_at INTEGER`);
  } catch {
    /* column already exists */
  }
  // Titles/episodes: single TMDB-sourced `rating` (replaces imdb_rating / tmdb_rating)
  try {
    await client.execute(`ALTER TABLE titles ADD COLUMN rating TEXT`);
  } catch {
    /* column already exists */
  }
  try {
    await client.execute(
      `UPDATE titles SET rating = COALESCE(tmdb_rating, imdb_rating) WHERE rating IS NULL`
    );
  } catch {
    /* legacy columns may be absent on fresh DBs */
  }
  try {
    await client.execute(`ALTER TABLE episodes ADD COLUMN rating TEXT`);
  } catch {
    /* column already exists */
  }
  try {
    await client.execute(
      `UPDATE episodes SET rating = imdb_rating WHERE rating IS NULL`
    );
  } catch {
    /* legacy column may be absent on fresh DBs */
  }
  try {
    await client.execute(`ALTER TABLE episodes ADD COLUMN overview TEXT`);
    await client.execute(`UPDATE titles SET fetched_at = 0 WHERE media_type = 'tv'`);
  } catch {
    /* column already exists */
  }
  try {
    await client.execute(`ALTER TABLE episodes ADD COLUMN imdb_id TEXT`);
  } catch {
    /* column already exists */
  }
  try {
    await client.execute(`ALTER TABLE titles ADD COLUMN popularity REAL`);
  } catch {
    /* column already exists */
  }
  await client.execute(
    `DELETE FROM thanks WHERE id NOT IN (
      SELECT id FROM (
        SELECT MIN(id) AS id FROM thanks GROUP BY from_wallet, to_wallet, title_id
      )
    )`
  );
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS thanks_unique ON thanks(from_wallet, to_wallet, title_id)`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().then(() => {
    console.log("DB migrated");
    process.exit(0);
  });
}
