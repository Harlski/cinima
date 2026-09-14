import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { MAX_RECOMMENDS } from "@cinima/shared";
import {
  ALL_TOUR_SPOTLIGHT_IDS,
  GUIDED_TOUR_STEPS,
  TOUR_CREATOR_WALLET,
  TOUR_SPOTLIGHT,
  advanceTourNext,
  shouldOfferRecommendCue,
  armForceGuidedTour,
  completeTour,
  consumeForceGuidedTour,
  initialTourRuntime,
  isForceGuidedTourArmed,
  isTourCreatorWallet,
  isTourSpotlightActive,
  loadTourPersistedStatus,
  offerTour,
  reportTourAction,
  saveTourPersistedStatus,
  shouldAutoOfferTour,
  skipTour,
  startTour,
  tourCoachPlacement,
  tourResolutionSyncPath,
  TOUR_COMMUNITY_FALLBACK_TITLE,
  TOUR_COMMUNITY_FALLBACK_TITLE_ID,
  TOUR_SKIP_NOTICE_BODY,
  TOUR_SKIP_NOTICE_TITLE,
  withTourCommunityFallback,
  tourStepAt,
  tourStepPrimaryLabel,
  tourStepShowsPrimaryButton,
  type TourAction,
  type TourRuntimeState,
} from "../src/lib/guidedTour";

const srcRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src"
);

function walkVueAndTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dev") continue;
      walkVueAndTsFiles(full, out);
      continue;
    }
    if (/\.(vue|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Expected end-to-end walkthrough — id, how to advance, coach band, key spotlights. */
const EXPECTED_WALKTHROUGH: readonly {
  id: string;
  showsPrimary: boolean;
  primaryLabel?: string;
  coach: "top" | "bottom";
  spotlights: readonly string[];
  action?: TourAction;
  discoverTab?: string;
  routeName?: string;
}[] = [
  {
    id: "watchlist-home",
    showsPrimary: true,
    primaryLabel: "Next",
    coach: "top",
    spotlights: [TOUR_SPOTLIGHT.tabWatchlist],
    routeName: "my-list",
  },
  {
    id: "search",
    showsPrimary: true,
    primaryLabel: "Next",
    coach: "top",
    spotlights: [TOUR_SPOTLIGHT.tabSearch],
    routeName: "search",
  },
  {
    id: "recommends",
    showsPrimary: true,
    primaryLabel: "Next",
    coach: "top",
    spotlights: [
      TOUR_SPOTLIGHT.tabDiscover,
      TOUR_SPOTLIGHT.discoverTabRecommends,
      TOUR_SPOTLIGHT.communityRecommendPoster,
    ],
    routeName: "discover",
    discoverTab: "recommends",
  },
  {
    id: "recommends-open",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.communityRecommendPoster],
    action: "open-title",
    routeName: "discover",
    discoverTab: "recommends",
  },
  {
    id: "add-watchlist",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.titleWatchlist],
    action: "watchlist-add",
  },
  {
    id: "watchlist-added",
    showsPrimary: true,
    primaryLabel: "Next",
    coach: "top",
    spotlights: [TOUR_SPOTLIGHT.tabWatchlist, TOUR_SPOTLIGHT.deckWatchlist],
    routeName: "my-list",
  },
  {
    id: "favorite-required",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.deckFavorite],
    action: "favorite",
    routeName: "my-list",
  },
  {
    id: "recommend-required",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.titleRecommend],
    action: "recommend",
    routeName: "title",
  },
  {
    id: "remove-watchlist",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.deckWatchlist],
    action: "watchlist-remove",
  },
  {
    id: "for-you",
    showsPrimary: true,
    primaryLabel: "Next",
    coach: "top",
    spotlights: [TOUR_SPOTLIGHT.tabDiscover, TOUR_SPOTLIGHT.discoverTabForYou],
    routeName: "discover",
    discoverTab: "for-you",
  },
  {
    id: "following-find",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.discoverTabFollowing, TOUR_SPOTLIGHT.findPeople],
    action: "open-find-people",
    routeName: "discover",
    discoverTab: "following",
  },
  {
    id: "creator-profile",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.findPeopleCreator],
    action: "open-creator-profile",
    routeName: "discover",
    discoverTab: "following",
  },
  {
    id: "creator-taste",
    showsPrimary: true,
    primaryLabel: "Next",
    coach: "bottom",
    spotlights: [
      TOUR_SPOTLIGHT.userRecommends,
      TOUR_SPOTLIGHT.userFavorites,
      TOUR_SPOTLIGHT.userFollow,
    ],
    routeName: "user",
  },
  {
    id: "clear-profile",
    showsPrimary: false,
    coach: "bottom",
    spotlights: [TOUR_SPOTLIGHT.titleFavorite],
    action: "unfavorite",
    routeName: "title",
  },
  {
    id: "tour-done",
    showsPrimary: true,
    primaryLabel: "Done",
    coach: "top",
    spotlights: [],
    routeName: "discover",
    discoverTab: "for-you",
  },
];

describe("Guided tour step contracts", () => {
  it("matches the expected walkthrough length and order", () => {
    expect(GUIDED_TOUR_STEPS.map((s) => s.id)).toEqual(
      EXPECTED_WALKTHROUGH.map((s) => s.id)
    );
  });

  it("tells Find people to peek Recommends from the Feed tab", () => {
    const step = GUIDED_TOUR_STEPS.find((s) => s.id === "following-find");
    expect(step?.discoverTab).toBe("following");
    expect(step?.body).toBe("Follow people to peek their Recommends.");
  });

  it("every step has a consistent primary-button contract", () => {
    for (const step of GUIDED_TOUR_STEPS) {
      const expected = EXPECTED_WALKTHROUGH.find((e) => e.id === step.id);
      expect(expected, `missing walkthrough entry for ${step.id}`).toBeTruthy();
      expect(
        tourStepShowsPrimaryButton(step),
        `${step.id} primary button visibility`
      ).toBe(expected!.showsPrimary);

      if (step.advance === "next" || step.advance === "action-or-next") {
        expect(
          step.primaryLabel || step.doneLabel,
          `${step.id} must declare primaryLabel/doneLabel`
        ).toBeTruthy();
        expect(tourStepPrimaryLabel(step)).toBe(expected!.primaryLabel);
      }

      if (step.advance === "action") {
        expect(step.action, `${step.id} action advance needs action`).toBeTruthy();
        expect(
          step.actionText,
          `${step.id} action steps must declare gold actionText`
        ).toBeTruthy();
        expect(
          tourStepShowsPrimaryButton(step),
          `${step.id} action steps must not show a primary button`
        ).toBe(false);
      }
    }
  });

  it("tutorial copy has no em dashes and uses the Watchlist confirm line", () => {
    for (const step of GUIDED_TOUR_STEPS) {
      expect(step.title.includes("\u2014") || step.title.includes("\u2013")).toBe(
        false
      );
      expect(step.body.includes("\u2014") || step.body.includes("\u2013")).toBe(
        false
      );
      if (step.actionText) {
        expect(
          step.actionText.includes("\u2014") || step.actionText.includes("\u2013")
        ).toBe(false);
      }
    }
    const added = GUIDED_TOUR_STEPS.find((s) => s.id === "watchlist-added");
    expect(added?.body).toBe(
      "There it is! Now you won't forget to watch it."
    );
    const taste = GUIDED_TOUR_STEPS.find((s) => s.id === "creator-taste");
    expect(taste?.body).toBe(
      "Recommends are gold-star picks. Favorites are the rest of what they enjoy. Follow if you like their taste."
    );
    const recommend = GUIDED_TOUR_STEPS.find((s) => s.id === "recommend-required");
    expect(recommend?.body).toBe(
      `Favorite means you like it. Recommend is the gold-star you'd tell a friend. You can hold ${MAX_RECOMMENDS} movie Recommends and ${MAX_RECOMMENDS} TV Recommends at a time.`
    );
    const clear = GUIDED_TOUR_STEPS.find((s) => s.id === "clear-profile");
    expect(clear?.actionText).toBe("Tap Favorited, then confirm.");
    expect(TOUR_SKIP_NOTICE_TITLE).toBe("Tour skipped");
    expect(TOUR_SKIP_NOTICE_BODY).toBe(
      "You can take the tour and complete it anytime from Me."
    );
  });

  it("every expected spotlight / route / coach placement matches", () => {
    for (const expected of EXPECTED_WALKTHROUGH) {
      const step = GUIDED_TOUR_STEPS.find((s) => s.id === expected.id)!;
      expect([...step.spotlights]).toEqual([...expected.spotlights]);
      expect(tourCoachPlacement(step)).toBe(expected.coach);
      if (expected.action) expect(step.action).toBe(expected.action);
      if (expected.routeName) expect(step.routeName).toBe(expected.routeName);
      if (expected.discoverTab) expect(step.discoverTab).toBe(expected.discoverTab);
    }
  });
});

describe("Guided tour step machine", () => {
  it("lists every spotlight id used by steps", () => {
    const used = new Set(GUIDED_TOUR_STEPS.flatMap((s) => s.spotlights));
    for (const id of used) {
      expect(ALL_TOUR_SPOTLIGHT_IDS).toContain(id);
    }
  });

  it("walks the happy path without skipping Watchlist practice", () => {
    let state = startTour(initialTourRuntime());
    expect(tourStepAt(state.stepIndex)?.id).toBe("watchlist-home");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(true);

    state = advanceTourNext(state); // search
    expect(tourStepAt(state.stepIndex)?.id).toBe("search");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(true);

    state = advanceTourNext(state); // recommends intro
    expect(tourStepAt(state.stepIndex)?.id).toBe("recommends");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(true);
    expect(tourCoachPlacement(tourStepAt(state.stepIndex))).toBe("top");

    state = advanceTourNext(state); // recommends-open — must NOT jump to for-you
    expect(tourStepAt(state.stepIndex)?.id).toBe("recommends-open");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(false);

    state = reportTourAction(state, "open-title", { titleId: "movie:1" });
    expect(state.tourTitleId).toBe("movie:1");
    expect(tourStepAt(state.stepIndex)?.id).toBe("add-watchlist");

    state = reportTourAction(state, "watchlist-add");
    expect(tourStepAt(state.stepIndex)?.id).toBe("watchlist-added");

    state = advanceTourNext(state); // favorite-required
    expect(tourStepAt(state.stepIndex)?.id).toBe("favorite-required");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(false);

    state = reportTourAction(state, "favorite");
    expect(state.tourTitleFavorited).toBe(true);
    expect(tourStepAt(state.stepIndex)?.id).toBe("recommend-required");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(false);

    state = reportTourAction(state, "recommend");
    expect(state.tourTitleRecommended).toBe(true);
    expect(tourStepAt(state.stepIndex)?.id).toBe("remove-watchlist");

    state = reportTourAction(state, "watchlist-remove");
    expect(tourStepAt(state.stepIndex)?.id).toBe("for-you");

    state = advanceTourNext(state); // following-find
    state = reportTourAction(state, "open-find-people");
    expect(tourStepAt(state.stepIndex)?.id).toBe("creator-profile");
    expect(tourStepAt(state.stepIndex)?.filterFindPeopleToCreator).toBe(true);

    state = reportTourAction(state, "open-creator-profile");
    expect(tourStepAt(state.stepIndex)?.id).toBe("creator-taste");
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(true);

    state = advanceTourNext(state);
    expect(tourStepAt(state.stepIndex)?.id).toBe("clear-profile");
    expect(tourStepAt(state.stepIndex)?.routeName).toBe("title");
    expect(tourStepAt(state.stepIndex)?.useTourTitle).toBe(true);
    expect(tourStepShowsPrimaryButton(tourStepAt(state.stepIndex))).toBe(false);

    state = reportTourAction(state, "unfavorite");
    expect(state.tourTitleFavorited).toBe(false);
    expect(tourStepAt(state.stepIndex)?.id).toBe("tour-done");
    expect(tourStepAt(state.stepIndex)?.showFeedbackLinks).toBe(true);

    state = advanceTourNext(state);
    expect(state.phase).toBe("completed");
  });

  it("opening a title from the Recommends intro still reaches Add to Watchlist", () => {
    let state = startTour(initialTourRuntime());
    state = advanceTourNext(state);
    state = advanceTourNext(state); // recommends
    expect(tourStepAt(state.stepIndex)?.id).toBe("recommends");
    state = reportTourAction(state, "open-title", { titleId: "tv:9" });
    expect(state.tourTitleId).toBe("tv:9");
    expect(tourStepAt(state.stepIndex)?.id).toBe("add-watchlist");
  });

  it("after Favorite, opens title detail and requires Recommend", () => {
    let state = startTour(initialTourRuntime());
    state = advanceTourNext(state); // search
    state = advanceTourNext(state); // recommends
    state = advanceTourNext(state); // recommends-open
    state = reportTourAction(state, "open-title", { titleId: "movie:1" });
    state = reportTourAction(state, "watchlist-add");
    state = advanceTourNext(state); // favorite-required
    expect(tourStepAt(state.stepIndex)?.id).toBe("favorite-required");

    state = reportTourAction(state, "favorite");

    const step = tourStepAt(state.stepIndex);
    expect(step?.id).toBe("recommend-required");
    expect(step?.routeName).toBe("title");
    expect(step?.useTourTitle).toBe(true);
    expect([...step!.spotlights]).toEqual([TOUR_SPOTLIGHT.titleRecommend]);
    expect(step?.advance).toBe("action");
    expect(step?.action).toBe("recommend");
    expect(tourStepShowsPrimaryButton(step)).toBe(false);
  });

  it("Recommend is required, then Watchlist remove - no Title Share step", () => {
    let state = startTour(initialTourRuntime());
    state = advanceTourNext(state); // search
    state = advanceTourNext(state); // recommends
    state = advanceTourNext(state); // recommends-open
    state = reportTourAction(state, "open-title", { titleId: "movie:1" });
    state = reportTourAction(state, "watchlist-add");
    state = advanceTourNext(state); // favorite-required
    state = reportTourAction(state, "favorite");
    expect(tourStepAt(state.stepIndex)?.id).toBe("recommend-required");

    state = reportTourAction(state, "recommend");
    expect(tourStepAt(state.stepIndex)?.id).toBe("remove-watchlist");
  });

  it("skips Favorite when the tour title is already Favorited", () => {
    let state = startTour(initialTourRuntime());
    state = advanceTourNext(state); // search
    state = advanceTourNext(state); // recommends
    state = advanceTourNext(state); // recommends-open
    state = reportTourAction(state, "open-title", { titleId: "movie:1" });
    state = reportTourAction(state, "watchlist-add");
    state = { ...state, tourTitleFavorited: true };
    state = advanceTourNext(state);
    expect(tourStepAt(state.stepIndex)?.id).toBe("recommend-required");
  });

  it("skips Recommend when the tour title is already Recommended", () => {
    let state = startTour(initialTourRuntime());
    state = advanceTourNext(state); // search
    state = advanceTourNext(state); // recommends
    state = advanceTourNext(state); // recommends-open
    state = reportTourAction(state, "open-title", { titleId: "movie:1" });
    state = reportTourAction(state, "watchlist-add");
    state = { ...state, tourTitleFavorited: true, tourTitleRecommended: true };
    state = advanceTourNext(state);
    expect(tourStepAt(state.stepIndex)?.id).toBe("remove-watchlist");
  });

  it("skips Watchlist practice only when landing on those steps without a title", () => {
    let state = startTour(initialTourRuntime());
    state = advanceTourNext(state); // search
    state = advanceTourNext(state); // recommends
    state = advanceTourNext(state); // recommends-open
    // Force-advance as if open-title was skipped somehow
    state = advanceTourNext(state);
    expect(state.tourTitleId).toBeNull();
    expect(tourStepAt(state.stepIndex)?.id).toBe("for-you");
  });

  it("ignores actions that do not match the current step", () => {
    let state = startTour(initialTourRuntime());
    const before = state.stepIndex;
    state = reportTourAction(state, "watchlist-add");
    expect(state.stepIndex).toBe(before);
  });

  it("spotlights only the active step targets", () => {
    const state: TourRuntimeState = {
      phase: "active",
      stepIndex: 0,
      tourTitleId: null,
      tourTitleFavorited: false,
      tourTitleRecommended: false,
    };
    expect(isTourSpotlightActive(state, TOUR_SPOTLIGHT.tabWatchlist)).toBe(true);
    expect(isTourSpotlightActive(state, TOUR_SPOTLIGHT.tabSearch)).toBe(false);
  });

  it("offer / skip / complete transitions", () => {
    let state = offerTour(initialTourRuntime());
    expect(state.phase).toBe("offer");
    state = startTour(state);
    expect(state.phase).toBe("active");
    state = skipTour(state);
    expect(state.phase).toBe("idle");
    state = completeTour(startTour(initialTourRuntime()));
    expect(state.phase).toBe("completed");
  });
});

describe("Recommend cue after Recommend", () => {
  it("offers the Recommend cue after a new Recommend outside the tour", () => {
    expect(
      shouldOfferRecommendCue({
        tourActive: false,
        wasRecommended: false,
      })
    ).toBe(true);
  });

  it("does not offer the Recommend cue when clearing a Recommend", () => {
    expect(
      shouldOfferRecommendCue({
        tourActive: false,
        wasRecommended: true,
      })
    ).toBe(false);
  });

  it("does not offer the Recommend cue during the guided tour", () => {
    expect(
      shouldOfferRecommendCue({
        tourActive: true,
        wasRecommended: false,
      })
    ).toBe(false);
  });
});

describe("Tour community Recommends fallback", () => {
  it("injects Fight Club when movies and TV are empty", () => {
    const filled = withTourCommunityFallback({ movies: [], tv: [] });
    expect(filled.movies).toEqual([TOUR_COMMUNITY_FALLBACK_TITLE]);
    expect(filled.tv).toEqual([]);
    expect(TOUR_COMMUNITY_FALLBACK_TITLE_ID).toBe("tmdb:movie:550");
    expect(TOUR_COMMUNITY_FALLBACK_TITLE.title).toBe("Fight Club");
  });

  it("leaves a populated community list alone", () => {
    const existing = {
      id: "tmdb:movie:13" as const,
      mediaType: "movie" as const,
      tmdbId: 13,
      title: "Forrest Gump",
      year: 1994,
      posterUrl: null,
      overview: null,
      rating: null,
      popularity: null,
      imdbId: null,
    };
    const filled = withTourCommunityFallback({ movies: [existing], tv: [] });
    expect(filled.movies).toEqual([existing]);
  });
});

describe("Guided tour Creator wallet", () => {
  it("normalizes spaced Creator address", () => {
    expect(isTourCreatorWallet(TOUR_CREATOR_WALLET)).toBe(true);
    expect(
      isTourCreatorWallet("NQ63 XN7E 020H H0RN RD6G 7QT1 Y7AM H1P5 H84B")
    ).toBe(true);
    expect(isTourCreatorWallet("NQ01 OTHER")).toBe(false);
  });
});

describe("Guided tour persistence and force arm", () => {
  const memory = new Map<string, string>();
  const session = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    session.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => session.get(key) ?? null,
        setItem: (key: string, value: string) => {
          session.set(key, value);
        },
        removeItem: (key: string) => {
          session.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "sessionStorage");
  });

  it("auto-offers only when never seen, unless force-armed", () => {
    expect(
      shouldAutoOfferTour({ persisted: "never", forceOffer: false })
    ).toBe(true);
    expect(
      shouldAutoOfferTour({ persisted: "dismissed", forceOffer: false })
    ).toBe(false);
    expect(
      shouldAutoOfferTour({ persisted: "completed", forceOffer: true })
    ).toBe(true);
  });

  it("syncs skipped and completed tours to the Achievement gate", () => {
    expect(tourResolutionSyncPath("never")).toBeNull();
    expect(tourResolutionSyncPath("dismissed")).toBe("/tour/skip");
    expect(tourResolutionSyncPath("completed")).toBe("/tour/complete");
  });

  it("persists dismissed / completed per wallet", () => {
    const wallet = "NQ01TESTWALLET";
    expect(loadTourPersistedStatus(wallet)).toBe("never");
    saveTourPersistedStatus(wallet, "dismissed");
    expect(loadTourPersistedStatus(wallet)).toBe("dismissed");
    saveTourPersistedStatus(wallet, "completed");
    expect(loadTourPersistedStatus(wallet)).toBe("completed");
  });

  it("force arm is consumable once", () => {
    expect(isForceGuidedTourArmed()).toBe(false);
    armForceGuidedTour();
    expect(isForceGuidedTourArmed()).toBe(true);
    expect(consumeForceGuidedTour()).toBe(true);
    expect(consumeForceGuidedTour()).toBe(false);
    expect(isForceGuidedTourArmed()).toBe(false);
  });
});

describe("Guided tour spotlight targets in source", () => {
  it("hides the coach while a confirm is open so Watchlist leave stays tappable", () => {
    const host = fs.readFileSync(
      path.join(srcRoot, "components/GuidedTourHost.vue"),
      "utf8"
    );
    const leave = fs.readFileSync(
      path.join(srcRoot, "components/WatchlistLeaveDialog.vue"),
      "utf8"
    );
    const confirm = fs.readFileSync(
      path.join(srcRoot, "components/ConfirmDialog.vue"),
      "utf8"
    );
    expect(host).toContain("body:has(.confirm-modal) .tour-coach");
    expect(host).not.toMatch(/:global\(body:has\(/);
    expect(host).not.toMatch(/body:has\(\.confirm-modal\)\s*\{/);
    expect(leave).toMatch(/z-index:\s*110/);
    expect(confirm).toMatch(/z-index:\s*110/);
  });

  it("every TOUR_SPOTLIGHT id appears as data-tour in templates", () => {
    const files = walkVueAndTsFiles(srcRoot);
    const blob = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");

    for (const id of ALL_TOUR_SPOTLIGHT_IDS) {
      const hasLiteral = blob.includes(`"${id}"`) || blob.includes(`'${id}'`);
      expect(hasLiteral, `Missing data-tour / spotlight id "${id}"`).toBe(true);
    }
  });

  it("every step action is reachable in the happy-path action set", () => {
    const actions = new Set<TourAction>();
    for (const step of GUIDED_TOUR_STEPS) {
      if (step.action) actions.add(step.action);
    }
    expect([...actions].sort()).toEqual(
      [
        "open-creator-profile",
        "open-find-people",
        "open-title",
        "favorite",
        "recommend",
        "unfavorite",
        "watchlist-add",
        "watchlist-remove",
      ].sort()
    );
  });
});
