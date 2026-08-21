import type { MediaType, TitleId } from "./ids.js";

export type GatePayload = {
  gate: true;
  message: string;
  openInPayUrl?: string;
};

export type SessionUser = {
  walletAddress: string;
  handle: string | null;
  lifetimeUnlocked: boolean;
  favoriteCount: number;
};

export type AuthChallengeResponse = {
  nonce: string;
  message: string;
  expiresAt: number;
};

export type AuthVerifyRequest = {
  nonce: string;
  message: string;
  signerPublicKey: string;
  signature: string;
  /** Demo / local only */
  demoWallet?: string;
};

export type AuthVerifyResponse = {
  token: string;
  user: SessionUser;
};

export type TitleSummary = {
  id: TitleId;
  /** Canonical media type */
  mediaType: MediaType;
  /** Alias used by some UI code paths */
  kind?: MediaType;
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
  imdbRating: number | null;
  tmdbRating: number | null;
};

export type EpisodeCell = {
  season: number;
  episode: number;
  name: string | null;
  imdbRating: number | null;
};

export type TitleDetail = TitleSummary & {
  unlocked: boolean;
  favorited: boolean;
  episodes: EpisodeCell[];
  commentCount: number;
};

export type CommentDto = {
  id: number;
  walletAddress: string;
  handle: string | null;
  body: string;
  createdAt: string;
};

export type OverlapSuggestion = {
  title: TitleSummary;
  sharedCount: number;
  sampleWallets: string[];
};

export type DiscoverResponse = {
  mode: "onboarding" | "overlap";
  favoriteCount: number;
  minFavorites: number;
  onboardingCandidates?: TitleSummary[];
  suggestions?: OverlapSuggestion[];
};

export type PublicProfile = {
  handle: string;
  walletAddress: string;
  favorites: TitleSummary[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  heatmap: HeatmapDay[];
};

export type HeatmapDay = {
  /** ISO date YYYY-MM-DD (UTC) */
  date: string;
  count: number;
};

export type FollowingFeedItem = {
  type: "favorite" | "unlock";
  walletAddress: string;
  handle: string | null;
  title: TitleSummary;
  createdAt: string;
};

export type FollowingFeedResponse = {
  items: FollowingFeedItem[];
};

export type ActivityItem =
  | {
      type: "comment";
      id: number;
      titleId: string;
      titleName: string;
      walletAddress: string;
      handle: string | null;
      body: string;
      createdAt: string;
    }
  | {
      type: "thanks";
      id: number;
      titleId: string;
      titleName: string;
      fromWallet: string;
      fromHandle: string | null;
      toWallet: string;
      createdAt: string;
      tipped: boolean;
    }
  | {
      type: "unlock";
      id: number;
      titleId: string;
      titleName: string;
      walletAddress: string;
      handle: string | null;
      createdAt: string;
    };

export type MeResponse = {
  user: SessionUser;
  favorites: TitleSummary[];
  unlocks: TitleSummary[];
  shareUrl: string | null;
  needsHandlePrompt: boolean;
};

export type PricesResponse = {
  unlockNim: number;
  lifetimeNim: number;
  commentNim: number;
  unlockLuna: number;
  lifetimeLuna: number;
  commentLuna: number;
  treasuryAddress: string;
};
