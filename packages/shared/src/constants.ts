/** 1 NIM = 100_000 Luna */
export const LUNA_PER_NIM = 100_000;

export const UNLOCK_NIM = 1;
export const UNLOCK_LUNA = UNLOCK_NIM * LUNA_PER_NIM;

export const LIFETIME_UNLOCK_NIM = 10_000;
export const LIFETIME_UNLOCK_LUNA = LIFETIME_UNLOCK_NIM * LUNA_PER_NIM;

export const COMMENT_NIM = 0.1;
export const COMMENT_LUNA = Math.round(COMMENT_NIM * LUNA_PER_NIM);

export const AMOUNTS = {
  UNLOCK: UNLOCK_LUNA,
  COMMENT: COMMENT_LUNA,
  LIFETIME: LIFETIME_UNLOCK_LUNA,
} as const;

export const MIN_FAVORITES_FOR_DISCOVER = 3;

/** Max gold-star Recommends a user may hold per media type (movie | tv) */
export const MAX_RECOMMENDS = 6;

/** Discover scoring: a shared Recommend outranks a plain shared Favorite */
export const DISCOVER_FAVORITE_WEIGHT = 1;
export const DISCOVER_RECOMMEND_WEIGHT = 3;

/** Re-fetch cached catalog rows after this many days */
export const CATALOG_TTL_DAYS = 10;

/** When false, Activity tab and heatmaps stay in the codebase but are not shown. */
export const ACTIVITY_UI_VISIBLE = false;

export const MEMO_PREFIX = {
  unlock: "unlock:",
  comment: "comment:",
  lifetime: "lifetime",
  thanks: "thanks:",
} as const;

export const TREASURY_MEMO_PREFIX = MEMO_PREFIX;
