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
  reportTourAction,
  saveTourPersistedStatus,
  shouldAutoOfferTour,
  skipTour,
  startTour,
  stepDiscoverTab,
  stepWantsCreatorFilter,
  tourStepAt,
  type TourAction,
  type TourPersistedStatus,
  type TourRuntimeState,
  type TourSpotlightId,
} from "@/lib/guidedTour";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesStore } from "@/stores/favorites";
import { useMarqueeStore } from "@/stores/marquee";

export const useGuidedTourStore = defineStore("guidedTour", () => {
  const runtime = ref<TourRuntimeState>(initialTourRuntime());
  /** True after we already auto-offered this session (avoid double offer). */
  const offeredThisSession = ref(false);
  /** Shown after Skip tour / Not now: take the tour anytime from Me. */
  const skipNotice = ref(false);
  const { request } = useApi();

  const phase = computed(() => runtime.value.phase);
  const stepIndex = computed(() => runtime.value.stepIndex);
  const step = computed(() =>
    runtime.value.phase === "active" ? tourStepAt(runtime.value.stepIndex) : null
  );
  const tourTitleId = computed(() => runtime.value.tourTitleId);
  const active = computed(() => runtime.value.phase === "active");
  const offering = computed(() => runtime.value.phase === "offer");
  const discoverTab = computed(() => stepDiscoverTab(runtime.value));
  const filterFindPeopleToCreator = computed(() =>
    stepWantsCreatorFilter(runtime.value)
  );

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

  function showOffer(opts?: { persistDecline?: boolean }) {
    persistDecline = opts?.persistDecline ?? true;
    runtime.value = offerTour(runtime.value);
  }

  function acceptOffer() {
    persistDecline = true;
    skipNotice.value = false;
    runtime.value = startTour(runtime.value);
  }

  function declineOffer() {
    runtime.value = dismissOffer(runtime.value);
    if (persistDecline) persist("dismissed");
    persistDecline = true;
    skipNotice.value = true;
  }

  /** Start from Me / explicit replay — skips the offer card. */
  function beginTour() {
    skipNotice.value = false;
    runtime.value = startTour(runtime.value);
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

  async function notifyTourCompleted() {
    persist("completed");
    try {
      const data = await request<{ earnedAchievements?: AchievementKind[] }>(
        "/tour/complete",
        { method: "POST" }
      );
      if (data.earnedAchievements?.length) {
        useMarqueeStore().enqueue(data.earnedAchievements);
      }
    } catch {
      // Award is best-effort; local completed status still sticks.
    }
  }

  function next() {
    const before = withFavoriteSnapshot(runtime.value);
    runtime.value = advanceTourNext(before);
    if (runtime.value.phase === "completed") void notifyTourCompleted();
  }

  function skip() {
    runtime.value = skipTour(runtime.value);
    persist("dismissed");
    skipNotice.value = true;
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

  return {
    runtime,
    phase,
    stepIndex,
    step,
    tourTitleId,
    active,
    offering,
    skipNotice,
    discoverTab,
    filterFindPeopleToCreator,
    isSpotlight,
    showOffer,
    acceptOffer,
    declineOffer,
    beginTour,
    next,
    skip,
    reportAction,
    maybeOfferAfterOnboarding,
    armForForceOnboarding,
    markCompleted,
    dismissSkipNotice,
  };
});
