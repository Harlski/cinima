import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { AchievementKind } from "@cinima/shared";
import {
  advanceTourNext,
  completeTour,
  consumeForceGuidedTour,
  dismissOffer,
  initialTourRuntime,
  isTourSpotlightActive,
  loadTourPersistedStatus,
  offerTour,
  pickTourOfferIndex,
  reportTourAction,
  requestTourSkip,
  resumeTour,
  saveTourPersistedStatus,
  shouldAutoOfferTour,
  startTour,
  stepDiscoverTab,
  stepWantsCreatorFilter,
  shouldHideForYouPassCoach,
  tourOfferCopy,
  tourResolutionSyncPath,
  tourStepAt,
  type TourAction,
  type TourOfferKind,
  type TourPersistedStatus,
  type TourRuntimeState,
  type TourSpotlightId,
} from "@/lib/guidedTour";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesStore } from "@/stores/favorites";
import { useJoinOverlayStore } from "@/stores/joinOverlay";
import { useMarqueeStore } from "@/stores/marquee";

export const useGuidedTourStore = defineStore("guidedTour", () => {
  const runtime = ref<TourRuntimeState>(initialTourRuntime());
  /** True after we already auto-offered this session (avoid double offer). */
  const offeredThisSession = ref(false);
  /** Shown after Skip tour / Not now: take the tour anytime from Me. */
  const skipNotice = ref(false);
  const forYouPassAwaitingRefill = ref(false);
  const offerKind = ref<TourOfferKind>("start");
  const offerIndex = ref(0);
  /** Cue lab wrap preview without walking the tour. */
  const wrapPreview = ref(false);
  const skipOfferShownThisRun = ref(false);
  const { request } = useApi();

  const phase = computed(() => runtime.value.phase);
  const stepIndex = computed(() => runtime.value.stepIndex);
  const step = computed(() =>
    runtime.value.phase === "active" ? tourStepAt(runtime.value.stepIndex) : null
  );
  const tourTitleId = computed(() => runtime.value.tourTitleId);
  const active = computed(() => runtime.value.phase === "active");
  const offering = computed(
    () => runtime.value.phase === "offer" || runtime.value.phase === "skip-offer"
  );
  const offerCopy = computed(() =>
    tourOfferCopy(offerKind.value, offerIndex.value)
  );
  const discoverTab = computed(() => stepDiscoverTab(runtime.value));
  const filterFindPeopleToCreator = computed(() =>
    stepWantsCreatorFilter(runtime.value)
  );
  const forYouPassLanded = computed(() => runtime.value.forYouPassLanded);
  const hideForYouPassCoach = computed(() =>
    shouldHideForYouPassCoach({
      stepId: step.value?.id,
      awaitingRefill: forYouPassAwaitingRefill.value,
    })
  );

  function setForYouPassAwaitingRefill(value: boolean) {
    forYouPassAwaitingRefill.value = value;
  }

  function walletKey(): string | null {
    const auth = useAuthStore();
    return auth.user?.walletAddress ?? null;
  }

  function persist(status: TourPersistedStatus) {
    const wallet = walletKey();
    if (!wallet) return;
    saveTourPersistedStatus(wallet, status);
  }

  function isSpotlight(id: TourSpotlightId): boolean {
    return isTourSpotlightActive(runtime.value, id);
  }

  /** When false, declining the offer does not persist skipped (Cue lab preview). */
  let persistDecline = true;

  function showOffer(opts?: {
    persistDecline?: boolean;
    kind?: TourOfferKind;
    offerIndex?: number;
  }) {
    wrapPreview.value = false;
    persistDecline = opts?.persistDecline ?? true;
    offerKind.value = opts?.kind ?? "start";
    offerIndex.value =
      opts?.offerIndex ?? pickTourOfferIndex();
    runtime.value = offerTour(runtime.value);
  }

  function acceptOffer() {
    persistDecline = true;
    skipNotice.value = false;
    wrapPreview.value = false;
    if (offerKind.value === "skip") {
      offerKind.value = "start";
      runtime.value = resumeTour(runtime.value);
      return;
    }
    offerKind.value = "start";
    skipOfferShownThisRun.value = false;
    runtime.value = startTour(runtime.value);
  }

  function declineOffer() {
    const kind = offerKind.value;
    offerKind.value = "start";
    wrapPreview.value = false;
    if (kind === "skip") {
      const skipped = requestTourSkip(runtime.value, true);
      runtime.value = skipped.state;
      if (persistDecline) {
        persist("dismissed");
        skipNotice.value = true;
        void notifyTourSkipped();
      } else {
        skipNotice.value = false;
      }
      persistDecline = true;
      return;
    }
    runtime.value = dismissOffer(runtime.value);
    if (persistDecline) {
      persist("dismissed");
      void notifyTourSkipped();
      skipNotice.value = true;
    } else {
      skipNotice.value = false;
    }
    persistDecline = true;
  }

  /** Start from Cue lab — skips the offer card. */
  function beginTour() {
    skipNotice.value = false;
    wrapPreview.value = false;
    skipOfferShownThisRun.value = false;
    offerKind.value = "start";
    runtime.value = startTour(runtime.value);
  }

  /** Replay from Me: same +10 NIM offer, without overwriting a completed tour. */
  function offerFromMe() {
    showOffer({ persistDecline: false, kind: "replay" });
  }

  function withFavoriteSnapshot(state: TourRuntimeState): TourRuntimeState {
    const titleId = state.tourTitleId;
    if (!titleId) {
      return { ...state, tourTitleFavorited: false, tourTitleRecommended: false };
    }
    const favoritesStore = useFavoritesStore();
    return {
      ...state,
      tourTitleFavorited: favoritesStore.isFavorite(titleId),
      tourTitleRecommended: favoritesStore.isRecommended(titleId),
    };
  }

  async function enqueueEarned(data: { earnedAchievements?: AchievementKind[] }) {
    if (data.earnedAchievements?.length) {
      useMarqueeStore().enqueue(data.earnedAchievements);
    }
  }

  async function notifyTourCompleted() {
    persist("completed");
    const join = useJoinOverlayStore();
    if (join.pending) void join.ack();
    try {
      const data = await request<{ earnedAchievements?: AchievementKind[] }>(
        "/tour/complete",
        { method: "POST" }
      );
      await enqueueEarned(data);
    } catch {
      // Award is best-effort; local completed status still sticks.
    }
  }

  async function notifyTourSkipped() {
    try {
      const data = await request<{ earnedAchievements?: AchievementKind[] }>(
        "/tour/skip",
        { method: "POST" }
      );
      await enqueueEarned(data);
    } catch {
      // Gate sync is best-effort; local skipped status still sticks.
    }
  }

  /** Push a local skip/complete onto the server so Achievement earning can open. */
  async function syncTourResolution() {
    const wallet = walletKey();
    if (!wallet) return;
    const path = tourResolutionSyncPath(loadTourPersistedStatus(wallet));
    if (!path) return;
    try {
      const data = await request<{ earnedAchievements?: AchievementKind[] }>(path, {
        method: "POST",
      });
      await enqueueEarned(data);
    } catch {
      // Best-effort; next session can retry.
    }
  }

  function next() {
    const before = withFavoriteSnapshot(runtime.value);
    runtime.value = advanceTourNext(before);
    if (runtime.value.phase === "completed") void notifyTourCompleted();
  }

  function skip() {
    const result = requestTourSkip(runtime.value, skipOfferShownThisRun.value);
    if (result.intercepted) {
      skipOfferShownThisRun.value = true;
      persistDecline = true;
      offerKind.value = "skip";
      wrapPreview.value = false;
      skipNotice.value = false;
      runtime.value = result.state;
      return;
    }
    forYouPassAwaitingRefill.value = false;
    runtime.value = result.state;
    persist("dismissed");
    skipNotice.value = true;
    wrapPreview.value = false;
    void notifyTourSkipped();
  }

  function reportAction(action: TourAction, payload?: { titleId?: string }) {
    const before = withFavoriteSnapshot(runtime.value);
    runtime.value = reportTourAction(before, action, payload);
    if (runtime.value.phase === "completed") void notifyTourCompleted();
  }

  /**
   * After Favorites onboarding clears into Discover overlap mode.
   * Shows the opt-in once per wallet (or when force-armed from welcome identicon).
   */
  function maybeOfferAfterOnboarding() {
    if (offeredThisSession.value) return;
    if (runtime.value.phase !== "idle") return;
    const wallet = walletKey();
    if (!wallet) return;

    const forceOffer = consumeForceGuidedTour();
    const persisted = loadTourPersistedStatus(wallet);
    if (!shouldAutoOfferTour({ persisted, forceOffer })) return;

    offeredThisSession.value = true;
    showOffer();
  }

  /** Dev force-onboarding: ensure the tour offer can appear again after favorites. */
  function armForForceOnboarding() {
    offeredThisSession.value = false;
  }

  function markCompleted() {
    runtime.value = completeTour(runtime.value);
    void notifyTourCompleted();
  }

  function dismissSkipNotice() {
    skipNotice.value = false;
  }

  function previewSkipOffer() {
    wrapPreview.value = false;
    skipNotice.value = false;
    persistDecline = false;
    skipOfferShownThisRun.value = true;
    offerKind.value = "skip";
    runtime.value = requestTourSkip(startTour(initialTourRuntime()), false).state;
  }

  function previewWrap() {
    skipNotice.value = false;
    persistDecline = true;
    offerKind.value = "start";
    runtime.value = initialTourRuntime();
    wrapPreview.value = true;
  }

  function dismissWrapPreview() {
    wrapPreview.value = false;
  }

  function clearCueLabTour() {
    wrapPreview.value = false;
    skipNotice.value = false;
    persistDecline = true;
    offerKind.value = "start";
    skipOfferShownThisRun.value = false;
    runtime.value = initialTourRuntime();
  }

  return {
    runtime,
    phase,
    stepIndex,
    step,
    tourTitleId,
    active,
    offering,
    offerCopy,
    offerKind,
    wrapPreview,
    skipNotice,
    discoverTab,
    filterFindPeopleToCreator,
    forYouPassAwaitingRefill,
    forYouPassLanded,
    hideForYouPassCoach,
    isSpotlight,
    showOffer,
    acceptOffer,
    declineOffer,
    beginTour,
    offerFromMe,
    next,
    skip,
    reportAction,
    maybeOfferAfterOnboarding,
    armForForceOnboarding,
    markCompleted,
    dismissSkipNotice,
    previewSkipOffer,
    previewWrap,
    dismissWrapPreview,
    clearCueLabTour,
    syncTourResolution,
    setForYouPassAwaitingRefill,
  };
});
