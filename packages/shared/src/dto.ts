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
  /** TMDB vote_average; null when unknown */
  rating: number | null;
  /** TMDB popularity; null when unknown */
  popularity: number | null;
  /** TMDB external IMDb title id (tt…); null when unknown */
  imdbId: string | null;
  /** Present when this title is a Recommend for the profile/owner context */
  recommended?: boolean;
};

export type EpisodeCell = {
  season: number;
  episode: number;
  name: string | null;
  /** TMDB episode synopsis; null when unknown */
  overview: string | null;
  /** TMDB episode vote_average; null when unknown */
  rating: number | null;
  /** TMDB external IMDb episode id (tt…); null when unknown */
  imdbId: string | null;
};

export type TitleDetail = TitleSummary & {
  unlocked: boolean;
  favorited: boolean;
  recommended: boolean;
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

export type TitleSuggester = {
  walletAddress: string;
  handle: string | null;
  thanked: boolean;
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
  recommends: TitleSummary[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  heatmap: HeatmapDay[];
  /** Public X (Twitter) handle, without @ */
  xHandle: string | null;
};

export type TitleShare = {
  handle: string;
  walletAddress: string;
  title: TitleSummary;
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
  recommends: TitleSummary[];
  unlocks: TitleSummary[];
  shareUrl: string | null;
  needsHandlePrompt: boolean;
  xHandle: string | null;
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
