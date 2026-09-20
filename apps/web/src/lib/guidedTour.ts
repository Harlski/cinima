import {
  CREATOR_WALLET,
  CREATOR_WALLET_DISPLAY,
  isCreatorWallet,
  makeTitleId,
  MAX_RECOMMENDS,
  normalizeWallet,
  type TitleSummary,
} from "@cinima/shared";

/** Spotlight target ids - every step spotlight must appear as data-tour in templates. */
export const TOUR_SPOTLIGHT = {
  tabWatchlist: "tab-watchlist",
  tabSearch: "tab-search",
  tabDiscover: "tab-discover",
  discoverTabForYou: "discover-tab-for-you",
  discoverTabRecommends: "discover-tab-recommends",
  discoverTabFollowing: "discover-tab-following",
  communityRecommendPoster: "community-recommend-poster",
  titleWatchlist: "title-watchlist",
  titleFavorite: "title-favorite",
  titleRecommend: "title-recommend",
  deckWatchlist: "deck-watchlist",
  deckFavorite: "deck-favorite",
  findPeople: "find-people",
  findPeopleCreator: "find-people-creator",
  forYouPassCard: "for-you-pass-card",
  userRecommends: "user-recommends",
  userFavorites: "user-favorites",
  userFollow: "user-follow",
} as const;

export type TourSpotlightId =
  (typeof TOUR_SPOTLIGHT)[keyof typeof TOUR_SPOTLIGHT];

export const ALL_TOUR_SPOTLIGHT_IDS: readonly TourSpotlightId[] =
  Object.values(TOUR_SPOTLIGHT);

/** Cinima Creator wallet shown during the Find people tour step. */
export const TOUR_CREATOR_WALLET_RAW = CREATOR_WALLET_DISPLAY;

export const TOUR_CREATOR_WALLET = CREATOR_WALLET;

export const TOUR_CREATOR_WALLET_DISPLAY = CREATOR_WALLET_DISPLAY;

export const isTourCreatorWallet = isCreatorWallet;

export type TourAction =
  | "open-title"
  | "watchlist-add"
  | "watchlist-remove"
  | "favorite"
  | "unfavorite"
  | "recommend"
  | "share-title"
  | "open-find-people"
  | "open-creator-profile"
  | "pass";

export type DiscoverTourTab = "for-you" | "recommends" | "following";

export type TourStepAdvance = "next" | "action" | "action-or-next";

export type TourStepDef = {
  id: string;
  title: string;
  body: string;
  /** Required user action, shown in gold in the coach card. */
  actionText?: string;
  spotlights: readonly TourSpotlightId[];
  /** Route name to open when entering this step (AppShell child). */
  routeName?: "my-list" | "search" | "discover" | "title" | "user";
  discoverTab?: DiscoverTourTab;
  /** When routeName is title/user, use stored tour title / Creator wallet. */
  useTourTitle?: boolean;
  useCreatorWallet?: boolean;
  advance: TourStepAdvance;
  action?: TourAction;
  /** Restrict Find people list to the Creator. */
  filterFindPeopleToCreator?: boolean;
  /** Show X / Telegram feedback buttons on the coach card. */
  showFeedbackLinks?: boolean;
  /** Override auto coach placement (e.g. wrap-up card). */
  coachPlacement?: TourCoachPlacement;
  primaryLabel?: string;
  doneLabel?: string;
};

const BOTTOM_TAB_SPOTLIGHTS: ReadonlySet<TourSpotlightId> = new Set([
  TOUR_SPOTLIGHT.tabWatchlist,
  TOUR_SPOTLIGHT.tabSearch,
  TOUR_SPOTLIGHT.tabDiscover,
]);

/** Coach sits above content; top when the glow is on the bottom tab bar. */
export type TourCoachPlacement = "top" | "bottom" | "header";

export type TourOfferKind = "start" | "replay" | "skip";

export type TourOfferCopy = {
  title: string;
  body: string;
  acceptLabel: string;
  declineLabel: string;
};

export type TourOfferBodyPart = {
  text: string;
  gold?: true;
  italic?: true;
};

export const TOUR_OFFER_BODY_SEGMENTS: readonly TourOfferBodyPart[] = [
  { text: "Learn how to " },
  { text: "search", gold: true },
  { text: " content for your:\n" },
  { text: "Watchlist", gold: true },
  { text: ", " },
  { text: "Favorites", gold: true },
  { text: " & " },
  { text: "Recommendations", gold: true },
];

function joinTourOfferBody(parts: readonly TourOfferBodyPart[]): string {
  return parts.reduce((out, part) => {
    const gap = part.italic && out.length > 0 && !out.endsWith("\n") ? "\n" : "";
    return out + gap + part.text;
  }, "");
}

export const TOUR_OFFER_VARIANTS: readonly TourOfferCopy[] = [
  {
    title: "Using CINIMA",
    body: joinTourOfferBody(TOUR_OFFER_BODY_SEGMENTS),
    acceptLabel: "Let's go",
    declineLabel: "Not now",
  },
];

export const TOUR_SKIP_OFFER_BODY_SEGMENTS: readonly TourOfferBodyPart[] = [
  { text: "We'll send you " },
  { text: "+10 NIM", gold: true },
  {
    text: " on completion - you can use this to thank other users on CINIMA.",
  },
  { text: "You'll feel at home in <60 seconds", italic: true },
];

export const TOUR_SKIP_OFFER: TourOfferCopy = {
  title: "The tour is quick",
  body: joinTourOfferBody(TOUR_SKIP_OFFER_BODY_SEGMENTS),
  acceptLabel: "Keep going",
  declineLabel: "Skip anyway",
};

export const TOUR_WRAP_TITLE = "Think CINIMA";
export const TOUR_WRAP_BODY =
  "You're set! Start browsing & come back anytime you need something new to watch.";
export const TOUR_WRAP_NIM = "+10 NIM is on its way";

export function pickTourOfferIndex(random: () => number = Math.random): number {
  const n = TOUR_OFFER_VARIANTS.length;
  return Math.min(n - 1, Math.max(0, Math.floor(random() * n)));
}

export function tourOfferAt(index: number): TourOfferCopy {
  const n = TOUR_OFFER_VARIANTS.length;
  const i = ((index % n) + n) % n;
  return TOUR_OFFER_VARIANTS[i]!;
}

export function tourOfferCopy(kind: TourOfferKind, index: number): TourOfferCopy {
  if (kind === "skip") return TOUR_SKIP_OFFER;
  return tourOfferAt(index);
}

export function tourOfferBodySegments(
  kind: TourOfferKind,
  _index: number
): readonly TourOfferBodyPart[] {
  if (kind === "skip") return TOUR_SKIP_OFFER_BODY_SEGMENTS;
  return TOUR_OFFER_BODY_SEGMENTS;
}

export function tourCoachPlacement(
  step:
    | Pick<TourStepDef, "spotlights" | "coachPlacement">
    | null
    | undefined
): TourCoachPlacement {
  if (!step) return "bottom";
  if (step.coachPlacement) return step.coachPlacement;
  if (step.spotlights.length === 0) return "top";
  return step.spotlights.some((id) => BOTTOM_TAB_SPOTLIGHTS.has(id))
    ? "top"
    : "bottom";
}

/** Step-def Next/Done. Host also shows Continue after a For You Pass lands. */
export function tourStepShowsPrimaryButton(
  step: Pick<TourStepDef, "advance"> | null | undefined
): boolean {
  if (!step) return false;
  return step.advance === "next" || step.advance === "action-or-next";
}

export function tourStepPrimaryLabel(
  step: Pick<TourStepDef, "primaryLabel" | "doneLabel"> | null | undefined
): string {
  if (!step) return "Next";
  return step.doneLabel || step.primaryLabel || "Next";
}

/** Next/Continue after a For You Pass lands, plus normal Next steps. */
export function tourCoachShowsContinue(opts: {
  step: Pick<TourStepDef, "advance" | "id"> | null | undefined;
  forYouPassLanded: boolean;
}): boolean {
  if (tourStepShowsPrimaryButton(opts.step)) return true;
  return opts.step?.id === "for-you" && opts.forYouPassLanded;
}

export function tourCoachShowsActionText(opts: {
  step: Pick<TourStepDef, "actionText" | "id"> | null | undefined;
  forYouPassLanded: boolean;
}): boolean {
  if (!opts.step?.actionText) return false;
  if (opts.step.id === "for-you" && opts.forYouPassLanded) return false;
  return true;
}

export function tourCoachContinueLabel(opts: {
  step: Pick<TourStepDef, "primaryLabel" | "doneLabel" | "id"> | null | undefined;
  forYouPassLanded: boolean;
}): string {
  if (opts.step?.id === "for-you" && opts.forYouPassLanded) return "Continue";
  return tourStepPrimaryLabel(opts.step);
}

export function tourCoachPrimaryGold(opts: {
  step: Pick<TourStepDef, "id"> | null | undefined;
  forYouPassLanded: boolean;
}): boolean {
  return opts.step?.id === "for-you" && opts.forYouPassLanded;
}

export const GUIDED_TOUR_STEPS: readonly TourStepDef[] = [
  {
    id: "watchlist-home",
    title: "Your Watchlist",
    body: "This is where you go to find things you've been meaning to watch.",
    spotlights: [TOUR_SPOTLIGHT.tabWatchlist],
    routeName: "my-list",
    advance: "next",
    primaryLabel: "Next",
  },
  {
    id: "search",
    title: "Search",
    body: "Search for movie and TV titles to see ratings.",
    spotlights: [TOUR_SPOTLIGHT.tabSearch],
    routeName: "search",
    advance: "next",
    primaryLabel: "Next",
  },
  {
    id: "recommends",
    title: "Community Recommends",
    body: "On Discover, open Recommends to see what other Cinima users recommend.",
    spotlights: [
      TOUR_SPOTLIGHT.tabDiscover,
      TOUR_SPOTLIGHT.discoverTabRecommends,
      TOUR_SPOTLIGHT.communityRecommendPoster,
    ],
    routeName: "discover",
    discoverTab: "recommends",
    advance: "next",
    primaryLabel: "Next",
  },
  {
    id: "recommends-open",
    title: "Open a title",
    body: "See what other Cinima users recommend.",
    actionText: "Tap a recommended title to open it.",
    spotlights: [TOUR_SPOTLIGHT.communityRecommendPoster],
    routeName: "discover",
    discoverTab: "recommends",
    advance: "action",
    action: "open-title",
  },
  {
    id: "add-watchlist",
    title: "Add to Watchlist",
    body: "Save it so it shows up on your Watchlist.",
    actionText: "Tap Add to Watchlist.",
    spotlights: [TOUR_SPOTLIGHT.titleWatchlist],
    advance: "action",
    action: "watchlist-add",
  },
  {
    id: "watchlist-added",
    title: "On your Watchlist",
    body: "There it is! Now you won't forget to watch it.",
    spotlights: [TOUR_SPOTLIGHT.tabWatchlist, TOUR_SPOTLIGHT.deckWatchlist],
    routeName: "my-list",
    advance: "next",
    primaryLabel: "Next",
  },
  {
    id: "favorite-required",
    title: "Favorite it",
    body: "Add it to Favorites so it shows on your profile.",
    actionText: "Tap Add to Favorites.",
    spotlights: [TOUR_SPOTLIGHT.deckFavorite],
    routeName: "my-list",
    advance: "action",
    action: "favorite",
  },
  {
    id: "recommend-required",
    title: "Recommend it",
    body: `You can recommend ${MAX_RECOMMENDS} Movies and ${MAX_RECOMMENDS} TV - these are your top picks. You can change at anytime, but make them count!`,
    actionText: "Tap Recommend.",
    spotlights: [TOUR_SPOTLIGHT.titleRecommend],
    routeName: "title",
    useTourTitle: true,
    advance: "action",
    action: "recommend",
  },
  {
    id: "remove-watchlist",
    title: "Done watching?",
    body: "When you're finished, remove it from your Watchlist.",
    actionText: "Tap In Watchlist, then confirm.",
    spotlights: [TOUR_SPOTLIGHT.deckWatchlist],
    routeName: "my-list",
    advance: "action",
    action: "watchlist-remove",
  },
  {
    id: "for-you",
    title: "For You",
    body: "For You is where you can find suggestions for content liked by other Cinima users",
    actionText: "Swipe up on the card to Pass",
    spotlights: [
      TOUR_SPOTLIGHT.tabDiscover,
      TOUR_SPOTLIGHT.forYouPassCard,
    ],
    routeName: "discover",
    discoverTab: "for-you",
    coachPlacement: "header",
    advance: "action",
    action: "pass",
  },
  {
    id: "following-find",
    title: "Find people",
    body: "Follow people to peek their Recommends.",
    actionText: "Tap Find.",
    spotlights: [TOUR_SPOTLIGHT.discoverTabFollowing, TOUR_SPOTLIGHT.findPeople],
    routeName: "discover",
    discoverTab: "following",
    advance: "action",
    action: "open-find-people",
  },
  {
    id: "creator-profile",
    title: "Meet the Creator",
    body: "See what they recommend on their profile.",
    actionText: "Open their profile.",
    spotlights: [TOUR_SPOTLIGHT.findPeopleCreator],
    routeName: "discover",
    discoverTab: "following",
    advance: "action",
    action: "open-creator-profile",
    filterFindPeopleToCreator: true,
  },
  {
    id: "creator-taste",
    title: "Taste & Follow",
    body: "Recommends are gold-star picks. Favorites are the rest of what they enjoy. Follow if you like their taste.",
    spotlights: [
      TOUR_SPOTLIGHT.userRecommends,
      TOUR_SPOTLIGHT.userFavorites,
      TOUR_SPOTLIGHT.userFollow,
    ],
    routeName: "user",
    useCreatorWallet: true,
    advance: "next",
    primaryLabel: "Next",
  },
  {
    id: "clear-profile",
    title: "Take it off your profile",
    body: "Favorites live on your profile. Remove this one so you know how to add and remove titles.",
    actionText: "Tap Favorited, then confirm.",
    spotlights: [TOUR_SPOTLIGHT.titleFavorite],
    routeName: "title",
    useTourTitle: true,
    advance: "action",
    action: "unfavorite",
  },
  {
    id: "tour-done",
    title: TOUR_WRAP_TITLE,
    body: TOUR_WRAP_BODY,
    spotlights: [],
    routeName: "discover",
    discoverTab: "for-you",
    advance: "next",
    primaryLabel: "Done",
    doneLabel: "Done",
    showFeedbackLinks: true,
    coachPlacement: "top",
  },
] as const;

export type TourPhase = "idle" | "offer" | "skip-offer" | "active" | "completed";

export type TourPersistedStatus = "never" | "dismissed" | "completed";

export type TourRuntimeState = {
  phase: TourPhase;
  stepIndex: number;
  /** Title opened during the Recommends step (for add / watchlist follow-up). */
  tourTitleId: string | null;
  /** True when the tour title is Favorited. */
  tourTitleFavorited: boolean;
  /** True when the tour title is Recommended. */
  tourTitleRecommended: boolean;
  /** True after the For You teaching Pass has landed a new set. */
  forYouPassLanded: boolean;
};

export function initialTourRuntime(): TourRuntimeState {
  return {
    phase: "idle",
    stepIndex: 0,
    tourTitleId: null,
    tourTitleFavorited: false,
    tourTitleRecommended: false,
    forYouPassLanded: false,
  };
}

export function tourStepAt(index: number): TourStepDef | null {
  return GUIDED_TOUR_STEPS[index] ?? null;
}

export function isTourSpotlightActive(
  state: TourRuntimeState,
  id: TourSpotlightId
): boolean {
  if (state.phase !== "active") return false;
  const step = tourStepAt(state.stepIndex);
  return Boolean(step?.spotlights.includes(id));
}

export function stepWantsCreatorFilter(state: TourRuntimeState): boolean {
  if (state.phase !== "active") return false;
  return Boolean(tourStepAt(state.stepIndex)?.filterFindPeopleToCreator);
}

export function stepDiscoverTab(
  state: TourRuntimeState
): DiscoverTourTab | null {
  if (state.phase !== "active") return null;
  return tourStepAt(state.stepIndex)?.discoverTab ?? null;
}

export function startTour(state: TourRuntimeState): TourRuntimeState {
  return {
    ...state,
    phase: "active",
    stepIndex: 0,
    tourTitleId: null,
    tourTitleFavorited: false,
    tourTitleRecommended: false,
    forYouPassLanded: false,
  };
}

export function offerTour(state: TourRuntimeState): TourRuntimeState {
  return { ...state, phase: "offer", stepIndex: 0 };
}

export function dismissOffer(state: TourRuntimeState): TourRuntimeState {
  return { ...state, phase: "idle", stepIndex: 0 };
}

export function skipTour(state: TourRuntimeState): TourRuntimeState {
  return {
    ...state,
    phase: "idle",
    stepIndex: 0,
    tourTitleId: null,
    tourTitleFavorited: false,
    tourTitleRecommended: false,
    forYouPassLanded: false,
  };
}

export function offerSkipLastChance(state: TourRuntimeState): TourRuntimeState {
  if (state.phase !== "active" && state.phase !== "offer") return state;
  return { ...state, phase: "skip-offer" };
}

export function resumeTour(state: TourRuntimeState): TourRuntimeState {
  if (state.phase !== "skip-offer") return state;
  return { ...state, phase: "active" };
}

export function requestTourSkip(
  state: TourRuntimeState,
  alreadyOffered: boolean
): { state: TourRuntimeState; intercepted: boolean } {
  if (state.phase === "active" && !alreadyOffered) {
    return { state: offerSkipLastChance(state), intercepted: true };
  }
  return { state: skipTour(state), intercepted: false };
}

export function completeTour(state: TourRuntimeState): TourRuntimeState {
  return {
    ...state,
    phase: "completed",
    stepIndex: 0,
    tourTitleId: null,
    tourTitleFavorited: false,
    tourTitleRecommended: false,
    forYouPassLanded: false,
  };
}

const TITLE_DEPENDENT_STEP_IDS = new Set([
  "add-watchlist",
  "watchlist-added",
  "favorite-required",
  "recommend-required",
  "remove-watchlist",
  "clear-profile",
]);

export function advanceTourNext(state: TourRuntimeState): TourRuntimeState {
  if (state.phase !== "active") return state;
  const next = state.stepIndex + 1;
  if (next >= GUIDED_TOUR_STEPS.length) return completeTour(state);
  return skipTitleStepsIfNeeded({
    ...state,
    stepIndex: next,
    forYouPassLanded: false,
  });
}

/** If the user skipped opening a title, jump past Watchlist action steps. */
export function skipTitleStepsIfNeeded(state: TourRuntimeState): TourRuntimeState {
  if (state.phase !== "active") return state;
  const step = tourStepAt(state.stepIndex);
  if (!step) return state;

  if (!state.tourTitleId && TITLE_DEPENDENT_STEP_IDS.has(step.id)) {
    const forYou = GUIDED_TOUR_STEPS.findIndex((s) => s.id === "for-you");
    if (forYou < 0) return state;
    return { ...state, stepIndex: forYou, forYouPassLanded: false };
  }

  if (step.id === "favorite-required" && state.tourTitleFavorited) {
    const rec = GUIDED_TOUR_STEPS.findIndex((s) => s.id === "recommend-required");
    if (rec < 0) return state;
    return skipTitleStepsIfNeeded({ ...state, stepIndex: rec });
  }

  if (step.id === "recommend-required" && state.tourTitleRecommended) {
    const remove = GUIDED_TOUR_STEPS.findIndex((s) => s.id === "remove-watchlist");
    if (remove < 0) return state;
    return skipTitleStepsIfNeeded({ ...state, stepIndex: remove });
  }

  if (step.id === "clear-profile" && !state.tourTitleFavorited) {
    const done = GUIDED_TOUR_STEPS.findIndex((s) => s.id === "tour-done");
    if (done < 0) return state;
    return { ...state, stepIndex: done };
  }

  return state;
}

/** Hide the For You coach after Pass so the next five can land in the clear. */
export function shouldHideForYouPassCoach(input: {
  stepId: string | undefined;
  awaitingRefill: boolean;
}): boolean {
  return input.stepId === "for-you" && input.awaitingRefill;
}

/**
 * Discover title taps that leave the page. Action steps stay put unless
 * opening a title is the step's action.
 */
export function tourAllowsTitleNavigation(
  step:
    | Pick<TourStepDef, "advance" | "action" | "routeName">
    | null
    | undefined
): boolean {
  if (!step) return true;
  if (step.action === "open-title") return true;
  return !(step.advance === "action" && step.routeName === "discover");
}

/**
 * Discover profile taps that leave the page. Find people stays put; only the
 * Creator profile action (and the taste step) may open that wallet.
 */
export function tourAllowsUserNavigation(
  step:
    | Pick<TourStepDef, "advance" | "action" | "routeName" | "useCreatorWallet">
    | null
    | undefined,
  wallet: string
): boolean {
  if (!step) return true;
  if (step.action === "open-creator-profile" || step.useCreatorWallet) {
    return isTourCreatorWallet(wallet);
  }
  return !(step.advance === "action" && step.routeName === "discover");
}

export function reportTourAction(
  state: TourRuntimeState,
  action: TourAction,
  payload?: { titleId?: string }
): TourRuntimeState {
  if (state.phase !== "active") return state;
  const step = tourStepAt(state.stepIndex);
  if (!step) return state;

  // Opening a title from either Recommends step jumps straight to Add to Watchlist.
  if (action === "open-title") {
    if (step.id !== "recommends" && step.id !== "recommends-open") return state;
    if (!payload?.titleId) return state;
    const addIdx = GUIDED_TOUR_STEPS.findIndex((s) => s.id === "add-watchlist");
    if (addIdx < 0) return state;
    return {
      ...state,
      tourTitleId: payload.titleId,
      stepIndex: addIdx,
    };
  }

  if (step.action !== action) return state;

  if (action === "pass") {
    return { ...state, forYouPassLanded: true };
  }

  let next = state;
  if (action === "favorite") next = { ...state, tourTitleFavorited: true };
  if (action === "recommend") next = { ...state, tourTitleRecommended: true };
  if (action === "unfavorite") {
    next = { ...state, tourTitleFavorited: false, tourTitleRecommended: false };
  }
  return advanceTourNext(next);
}

/** After a successful new Recommend outside the tour, show the Recommend cue. */
export function shouldOfferRecommendCue(opts: {
  tourActive: boolean;
  wasRecommended: boolean;
}): boolean {
  return !opts.tourActive && !opts.wasRecommended;
}

export const TOUR_SKIP_NOTICE_TITLE = "Tour skipped";
export const TOUR_SKIP_NOTICE_BODY =
  'You can "Take the Tour" anytime from your profile (The Me tab).';

/** Fight Club - always available so Community Recommends is never empty during the tour. */
export const TOUR_COMMUNITY_FALLBACK_TITLE_ID = makeTitleId("movie", 550);

export const TOUR_COMMUNITY_FALLBACK_TITLE: TitleSummary = {
  id: TOUR_COMMUNITY_FALLBACK_TITLE_ID,
  mediaType: "movie",
  kind: "movie",
  tmdbId: 550,
  title: "Fight Club",
  year: 1999,
  posterUrl: "https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  overview: null,
  rating: 8.4,
  popularity: null,
  imdbId: "tt0137523",
  recommendCount: 1,
};

export function withTourCommunityFallback(input: {
  movies: TitleSummary[];
  tv: TitleSummary[];
}): { movies: TitleSummary[]; tv: TitleSummary[] } {
  if (input.movies.length || input.tv.length) {
    return { movies: input.movies, tv: input.tv };
  }
  return { movies: [TOUR_COMMUNITY_FALLBACK_TITLE], tv: [] };
}

export function communityRecommendsForTour(opts: {
  tourActive: boolean;
  movies: TitleSummary[];
  tv: TitleSummary[];
}): { movies: TitleSummary[]; tv: TitleSummary[] } {
  if (!opts.tourActive) return { movies: opts.movies, tv: opts.tv };
  return withTourCommunityFallback({ movies: opts.movies, tv: opts.tv });
}

export function shouldAutoOfferTour(opts: {
  persisted: TourPersistedStatus;
  forceOffer: boolean;
}): boolean {
  if (opts.forceOffer) return true;
  return opts.persisted === "never";
}

/** Start and Using CINIMA wait; skip last chance does not. */
export function shouldHoldTourOffer(opts: {
  digestOpen: boolean;
  joinPending: boolean;
  offerKind: TourOfferKind;
}): boolean {
  if (opts.offerKind === "skip") return false;
  return opts.digestOpen || opts.joinPending;
}

/** Sync local tour skip/complete onto the server Achievement gate. */
export function tourResolutionSyncPath(
  persisted: TourPersistedStatus
): "/tour/skip" | "/tour/complete" | null {
  if (persisted === "dismissed") return "/tour/skip";
  if (persisted === "completed") return "/tour/complete";
  return null;
}

const FORCE_TOUR_SESSION_KEY = "cinima.forceGuidedTour";

export function armForceGuidedTour(): void {
  try {
    sessionStorage.setItem(FORCE_TOUR_SESSION_KEY, "1");
  } catch {
    // Ignore quota / private mode
  }
}

export function consumeForceGuidedTour(): boolean {
  try {
    const v = sessionStorage.getItem(FORCE_TOUR_SESSION_KEY);
    if (!v) return false;
    sessionStorage.removeItem(FORCE_TOUR_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isForceGuidedTourArmed(): boolean {
  try {
    return sessionStorage.getItem(FORCE_TOUR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function storageKey(wallet: string): string {
  return `cinima.guidedTour.${normalizeWallet(wallet)}`;
}

export function loadTourPersistedStatus(wallet: string): TourPersistedStatus {
  try {
    const raw = localStorage.getItem(storageKey(wallet));
    if (raw === "dismissed" || raw === "completed") return raw;
    return "never";
  } catch {
    return "never";
  }
}

export function saveTourPersistedStatus(
  wallet: string,
  status: TourPersistedStatus
): void {
  try {
    if (status === "never") localStorage.removeItem(storageKey(wallet));
    else localStorage.setItem(storageKey(wallet), status);
  } catch {
    // Ignore quota / private mode
  }
}

