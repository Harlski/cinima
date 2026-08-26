import { computed, ref } from "vue";
import { defineStore } from "pinia";
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
import { useAuthStore } from "@/stores/auth";

export const useGuidedTourStore = defineStore("guidedTour", () => {
  const runtime = ref<TourRuntimeState>(initialTourRuntime());
  /** True after we already auto-offered this session (avoid double offer). */
  const offeredThisSession = ref(false);

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

  function showOffer() {
    runtime.value = offerTour(runtime.value);
  }

  function acceptOffer() {
    runtime.value = startTour(runtime.value);
  }

  function declineOffer() {
    runtime.value = dismissOffer(runtime.value);
    persist("dismissed");
  }

  /** Start from Me / explicit replay — skips the offer card. */
  function beginTour() {
    runtime.value = startTour(runtime.value);
  }

  function next() {
    const before = runtime.value;
    runtime.value = advanceTourNext(before);
    if (runtime.value.phase === "completed") persist("completed");
  }

  function skip() {
    runtime.value = skipTour(runtime.value);
    persist("dismissed");
  }

  function reportAction(action: TourAction, payload?: { titleId?: string }) {
    const before = runtime.value;
    runtime.value = reportTourAction(before, action, payload);
    if (runtime.value.phase === "completed") persist("completed");
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
    persist("completed");
  }

  return {
    runtime,
    phase,
    stepIndex,
    step,
    tourTitleId,
    active,
    offering,
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
  };
});
