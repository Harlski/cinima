<template>
  <div
    class="discover"
    :class="{
      'discover--onboarding': mode === 'onboarding' && !showHandleStep,
      'discover--handle': showHandleStep,
      'discover--overlap': !loading && mode === 'overlap' && !showHandleStep,
      'discover--for-you':
        !loading && mode === 'overlap' && !showHandleStep && activeTab === 'for-you',
      'discover--recommends':
        !loading && mode === 'overlap' && !showHandleStep && activeTab === 'recommends',
    }"
    :data-fy-mode="mode"
    :data-fy-tab="activeTab"
    :data-fy-n="suggestions.length"
    :data-fy-loading="loading ? '1' : '0'"
    :data-fy-handle="showHandleStep ? '1' : '0'"
  >
    <HandleOnboarding
      v-if="showHandleStep"
      :wallet-address="authStore.user?.walletAddress ?? null"
      :initial-handle="isForceHandleArmed() ? authStore.user?.handle : null"
      :busy="handleBusy"
      :save-error="handleSaveError"
      @continue="onHandleContinue"
    />

    <template v-else-if="mode === 'onboarding'">
      <div v-if="onboardingBusy || loading" class="tab-pane-wait">
        <LoadingWait />
      </div>
      <FavoritesOnboarding
        v-show="!onboardingBusy && !loading"
        :candidates="onboardingCandidates"
        :min-favorites="minFavorites"
        :busy="onboardingBusy"
        :save-error="onboardingSaveError"
        @continue="onOnboardingContinue"
        @skip="onOnboardingSkip"
      />
    </template>

    <div v-else-if="loading" class="tab-pane-wait">
      <LoadingWait />
    </div>

    <div v-else class="discover-body">
      <FollowingStrip
        v-if="activeTab === 'following'"
        :people="followingPeople"
        :selected-wallet="peekWallet"
        @select="onPeekFollowee"
        @find-people="openFindPeople"
      />

      <section
        v-if="activeTab === 'for-you'"
        class="suggestions-section"
        :class="{ 'suggestions-section--refilling': forYouRefilling }"
      >
        <ForYouPicker
          :suggestions="suggestions"
          :is-favorite="favoritesStore.isFavorite"
          :is-on-watchlist="watchlistStore.isOnWatchlist"
          :pass-only="tourForYouPassStep"
          :tour-pass-spotlight="tourForYouPassGlow"
          dock-bottom-offset="var(--discover-feed-tabs-height, 2.85rem)"
          @toggle-favorite="toggleFavorite"
          @toggle-watchlist="toggleWatchlist"
          @open="goToTitle"
          @open-overview="goToTitleOverview"
          @pass="onPass"
        />
      </section>

      <section v-else-if="activeTab === 'recommends'" class="recommends-section">
        <div v-if="communityLoading && !communityLoaded" class="loading">
          <LoadingWait />
        </div>
        <div
          v-else-if="!tourCommunityMovies.length && !tourCommunityTv.length"
          class="feed-empty"
        >
          No community Recommends yet.
        </div>
        <CommunityRecommends
          v-else
          :movies="tourCommunityMovies"
          :tv="tourCommunityTv"
          heading="What others on Cinima recommend"
          :max-rows="4"
          tour-first-poster
          @select="goToTitleSummary"
        />
      </section>

      <section v-else class="feed-section">
        <div v-if="followingLoading" class="loading">
          <LoadingWait />
        </div>
        <div v-else-if="commentFeed.length === 0" class="feed-empty">
          No comments yet
        </div>
        <CommentFeedGrouped
          :items="commentFeed"
          :own-wallet="authStore.user?.walletAddress ?? null"
          :thank-busy-id="null"
          @open-user="goToUser"
          @open-title="goToTitle"
          @thank="thankComment"
          @send="offerCommentSend"
        />
      </section>
    </div>

    <Transition name="feed-tabs-slide">
      <nav
        v-if="!loading && mode === 'overlap' && !showHandleStep"
        class="discover-feed-tabs"
        :class="{ 'discover-feed-tabs--tour-glow': tourFeedTabGlow }"
        aria-label="Discover feeds"
      >
        <div class="discover-feed-tabs-inner">
          <div class="discover-tabs" role="tablist">
            <TourSpotlight :id="TOUR_SPOTLIGHT.discoverTabForYou" radius="6px">
              <button
                type="button"
                role="tab"
                class="discover-tab"
                :class="{ active: activeTab === 'for-you' }"
                :aria-selected="activeTab === 'for-you'"
                :data-tour="TOUR_SPOTLIGHT.discoverTabForYou"
                @click="activeTab = 'for-you'"
              >
                For You
              </button>
            </TourSpotlight>
            <TourSpotlight :id="TOUR_SPOTLIGHT.discoverTabRecommends" radius="6px">
              <button
                type="button"
                role="tab"
                class="discover-tab"
                :class="{ active: activeTab === 'recommends' }"
                :aria-selected="activeTab === 'recommends'"
                :data-tour="TOUR_SPOTLIGHT.discoverTabRecommends"
                @click="activeTab = 'recommends'"
              >
                Recommends
              </button>
            </TourSpotlight>
            <TourSpotlight :id="TOUR_SPOTLIGHT.discoverTabFollowing" radius="6px">
              <button
                type="button"
                role="tab"
                class="discover-tab"
                :class="{ active: activeTab === 'following' }"
                :aria-selected="activeTab === 'following'"
                :data-tour="TOUR_SPOTLIGHT.discoverTabFollowing"
                @click="activeTab = 'following'"
              >
                Feed
              </button>
            </TourSpotlight>
          </div>
        </div>
      </nav>
    </Transition>

    <FindPeopleSheet
      v-if="findPeopleOpen"
      :people="visibleFindPeople"
      :loading="peopleLoading"
      :busy-wallet="followBusyWallet"
      :highlight-creator="tour.filterFindPeopleToCreator"
      @close="findPeopleOpen = false"
      @open-profile="onOpenPersonProfile"
      @follow="onFollowPerson"
    />

    <FolloweePeekSheet
      v-if="peekWallet"
      :profile="peekProfile"
      :loading="peekLoading"
      @close="closePeek"
      @view-profile="onPeekViewProfile"
      @open-title="onPeekOpenTitle"
    />

    <TitleActionDialogs
      :pending="pendingConfirm"
      :message="confirmMessage"
      :reason="leaveReason"
      :thank-all="thankAllCue"
      :thank-all-busy="thankAllBusy"
      @update:reason="leaveReason = $event"
      @cancel="cancelConfirm"
      @confirm="onConfirmAction"
      @cancel-thank-all="cancelThankAll"
      @confirm-thank-all="confirmThankAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onActivated, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import {
  FORCE_FAVORITES_PICK_QUERY,
  advanceForceOnboardingToFavorites,
  armForceOnboardingFlow,
  canForceFavoritesPick,
  clearForceOnboardingFlow,
  isForceHandleArmed,
  isForceOnboardingArmed,
} from "@/lib/welcome";
import { useFavoritesStore } from "@/stores/favorites";
import { useWatchlistStore } from "@/stores/watchlist";
import type {
  AchievementKind,
  CommentFeedItem,
  CommentFeedResponse,
  DiscoverResponse,
  FollowingPeopleResponse,
  FollowingPerson,
  ForYouPassResponse,
  ForYouUpcomingResponse,
  OverlapSuggestion,
  FindPeopleEntry,
  FindPeopleResponse,
  PublicProfile,
  TitleSummary,
} from "@cinima/shared";
import { shouldPrefetchForYou } from "@cinima/shared";
import {
  applyLocalForYouPass,
  FOR_YOU_SLOT_ATTR,
  PASS_COLLAPSE_MS,
  reconcileForYouPass,
} from "@/lib/forYouPass";
import { forYouDebugLog } from "@/lib/forYouDebug";
import FavoritesOnboarding from "@/components/FavoritesOnboarding.vue";
import HandleOnboarding from "@/components/HandleOnboarding.vue";
import {
  mapHandleSaveError,
  shouldOfferHandleOnboarding,
} from "@/lib/handleOnboarding";
import { preloadImages } from "@/lib/preloadImages";
import { useAuthStore } from "@/stores/auth";
import CommunityRecommends from "@/components/CommunityRecommends.vue";
import CommentFeedGrouped from "@/components/CommentFeedGrouped.vue";
import FindPeopleSheet from "@/components/FindPeopleSheet.vue";
import FolloweePeekSheet from "@/components/FolloweePeekSheet.vue";
import TitleActionDialogs from "@/components/TitleActionDialogs.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import {
  TOUR_CREATOR_WALLET,
  TOUR_SPOTLIGHT,
  communityRecommendsForTour,
  isTourCreatorWallet,
  tourAllowsTitleNavigation,
  tourAllowsUserNavigation,
} from "@/lib/guidedTour";
import { useGuidedTourStore } from "@/stores/guidedTour";
import FollowingStrip from "@/components/FollowingStrip.vue";
import ForYouPicker from "@/components/ForYouPicker.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import {
  loadFollowingStripSeen,
  markFollowingStripSeen,
  sortFollowingStripPeople,
} from "@/lib/followingStrip";
import { useCommunityRecommends } from "@/composables/useCommunityRecommends";
import { useTitleActionConfirm } from "@/composables/useTitleActionConfirm";
import { useMarqueeStore } from "@/stores/marquee";
import { useTitleFlightStore } from "@/stores/titleFlight";
import {
  FOR_YOU_REFRESH_QUERY,
  isForYouRefreshQuery,
} from "@/lib/forYouRestore";
import { useForYouMotionStore } from "@/stores/forYouMotion";
import { useUserSendStore } from "@/stores/userSend";

defineOptions({ name: "Discover" });

const router = useRouter();
const route = useRoute();
const { request } = useApi();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const titleFlight = useTitleFlightStore();
const forYouMotion = useForYouMotionStore();
const forYouRefilling = computed(() => forYouMotion.refills.length > 0);
const passBusy = ref(false);
const tour = useGuidedTourStore();
const tourForYouPassStep = computed(() => tour.active && tour.step?.id === "for-you");
const tourForYouPassGlow = computed(
  () =>
    tourForYouPassStep.value &&
    suggestions.value.length === 1 &&
    !tour.forYouPassAwaitingRefill
);
const tourFeedTabGlow = computed(
  () =>
    tour.isSpotlight(TOUR_SPOTLIGHT.discoverTabForYou) ||
    tour.isSpotlight(TOUR_SPOTLIGHT.discoverTabRecommends) ||
    tour.isSpotlight(TOUR_SPOTLIGHT.discoverTabFollowing)
);
const {
  pendingConfirm,
  confirmMessage,
  leaveReason,
  thankAllCue,
  thankAllBusy,
  cancelConfirm,
  cancelThankAll,
  confirmThankAll,
  confirmPending,
  requestToggleFavorite,
  requestToggleWatchlist,
} = useTitleActionConfirm();

const loading = ref(true);
const mode = ref<"onboarding" | "overlap">("onboarding");
const activeTab = ref<"for-you" | "recommends" | "following">("for-you");
const {
  movies: communityMovies,
  tv: communityTv,
  loaded: communityLoaded,
  loading: communityLoading,
  load: loadCommunityRecommends,
} = useCommunityRecommends();
const tourCommunity = computed(() =>
  communityRecommendsForTour({
    tourActive: tour.active,
    movies: communityMovies.value,
    tv: communityTv.value,
  })
);
const tourCommunityMovies = computed(() => tourCommunity.value.movies);
const tourCommunityTv = computed(() => tourCommunity.value.tv);
const favoriteCount = ref(0);
const minFavorites = ref(3);
const onboardingCandidates = ref<TitleSummary[]>([]);
const onboardingBusy = ref(false);
const onboardingSaveError = ref<string | null>(null);
const followingLoading = ref(false);
const showHandleStep = ref(false);
const handleBusy = ref(false);
const handleSaveError = ref<string | null>(null);
const suggestions = ref<OverlapSuggestion[]>([]);
let warmedUpcomingKey = "";
const upcomingBank = ref<OverlapSuggestion[]>([]);
const passQueue: string[] = [];
let drainingPasses = false;
const commentFeed = ref<CommentFeedItem[]>([]);
const followingPeople = ref<FollowingPerson[]>([]);
const peekWallet = ref<string | null>(null);
const peekProfile = ref<PublicProfile | null>(null);
const peekLoading = ref(false);
const findPeopleOpen = ref(false);
const findPeople = ref<FindPeopleEntry[]>([]);
const peopleLoading = ref(false);
const followBusyWallet = ref<string | null>(null);
const followingStripReady = ref(false);
/** True once a discover response has been applied (possibly while Handle was open). */
const discoverApplied = ref(false);
/** Creator row injected when Find people is filtered for the guided tour. */
const tourCreatorEntry = ref<FindPeopleEntry | null>(null);

watch(
  () => useUserSendStore().lastThanked,
  (thanked) => {
    if (!thanked || thanked.kind !== "comment") return;
    commentFeed.value = commentFeed.value.map((row) =>
      row.id === thanked.commentId
        ? {
            ...row,
            thanked: true,
            thanksCount: row.thanked ? row.thanksCount : row.thanksCount + 1,
          }
        : row
    );
  }
);

watch(
  () => useUserSendStore().lastAttached,
  (attached) => {
    if (!attached || attached.kind !== "comment") return;
    commentFeed.value = commentFeed.value.map((row) =>
      row.id === attached.commentId ? { ...row, sent: true } : row
    );
  }
);

const visibleFindPeople = computed(() => {
  if (!tour.filterFindPeopleToCreator) return findPeople.value;
  if (tourCreatorEntry.value) return [tourCreatorEntry.value];
  const fromList = findPeople.value.filter((p) =>
    isTourCreatorWallet(p.walletAddress)
  );
  return fromList;
});

const loadFollowingPeople = async () => {
  const res = await request<FollowingPeopleResponse>("/following").catch(
    () => ({ people: [] as FollowingPerson[] })
  );
  followingPeople.value = sortFollowingStripPeople(res.people, loadFollowingStripSeen());
  followingStripReady.value = true;
};

const loadCommentFeed = async () => {
  const feedRes = await request<CommentFeedResponse>("/comments/feed").catch(
    () => ({ items: [] as CommentFeedItem[] })
  );
  commentFeed.value = feedRes.items;
};

const applyFollowingStripOrder = () => {
  if (!followingPeople.value.length) return;
  followingPeople.value = sortFollowingStripPeople(
    followingPeople.value,
    loadFollowingStripSeen()
  );
};

const ensureFollowingTabData = async () => {
  const firstVisit = !followingStripReady.value;
  if (firstVisit) followingLoading.value = true;
  try {
    if (!followingStripReady.value) {
      await loadFollowingPeople();
    } else {
      applyFollowingStripOrder();
    }
    await loadCommentFeed();
  } finally {
    followingLoading.value = false;
  }
};

function resetAppContentScroll() {
  const el = document.querySelector(".app-content");
  if (el instanceof HTMLElement) el.scrollTop = 0;
}

const syncHandleStep = () => {
  showHandleStep.value = shouldOfferHandleOnboarding({
    walletAddress: authStore.user?.walletAddress,
    handle: authStore.user?.handle,
    forceOffer: isForceHandleArmed(),
  });
};

/** In-flight discover + poster warm-up while the username step is visible. */
let discoverWarmPromise: Promise<void> | null = null;

const applyDiscoverResponse = async (data: DiscoverResponse) => {
  mode.value = data.mode;
  favoriteCount.value = data.favoriteCount;
  minFavorites.value = data.minFavorites;

  if (data.mode === "onboarding" && data.onboardingCandidates) {
    onboardingCandidates.value = data.onboardingCandidates;
    await preloadImages(
      data.onboardingCandidates.map((t) => t.posterUrl),
      { timeoutMs: 4_000 }
    );
  } else if (data.mode === "overlap" && data.suggestions) {
    suggestions.value = data.suggestions;
    followingStripReady.value = false;
    if (activeTab.value === "following") {
      await ensureFollowingTabData();
    }
    void warmUpcomingForYou(data.upcoming);
  }
  discoverApplied.value = true;
  forYouDebugLog(
    `discover mode=${data.mode} n=${data.suggestions?.length ?? 0} posters=${
      data.suggestions?.filter((s) => Boolean(s.title.posterUrl?.trim())).length ?? 0
    } pending=${forYouMotion.pendingRefillSlots.join(",") || "-"}`
  );
};

const fetchDiscover = async () => {
  const forcePick = canForceFavoritesPick() && isForceOnboardingArmed();
  const discoverPath = forcePick ? "/discover?forceOnboarding=1" : "/discover";
  try {
    const data = await request<DiscoverResponse>(discoverPath);
    await applyDiscoverResponse(data);
  } catch (err) {
    forYouDebugLog(
      `discover fail ${err instanceof Error ? err.message : String(err)}`
    );
    throw err;
  }
};

const warmDiscoverInBackground = () => {
  if (discoverWarmPromise) return discoverWarmPromise;
  discoverWarmPromise = (async () => {
    try {
      await fetchDiscover();
    } finally {
      discoverWarmPromise = null;
    }
  })();
  return discoverWarmPromise;
};

const awaitDiscoverReady = async () => {
  loading.value = true;
  try {
    if (discoverWarmPromise) await discoverWarmPromise;
    else await fetchDiscover();
  } finally {
    loading.value = false;
  }
};

const loadDiscover = async () => {
  const queryForce =
    canForceFavoritesPick() &&
    String(route.query[FORCE_FAVORITES_PICK_QUERY] ?? "") === "1";
  const queryRefresh = isForYouRefreshQuery(route.query);
  if (queryForce) {
    armForceOnboardingFlow();
  }
  forYouDebugLog(
    `loadDiscover refresh=${queryRefresh ? "1" : "0"} pending=${
      forYouMotion.pendingRefillSlots.join(",") || "-"
    }`
  );
  forYouMotion.reset();

  syncHandleStep();

  if (showHandleStep.value) {
    // Username first: show Handle immediately and warm Favorites cards behind it.
    loading.value = false;
    void warmDiscoverInBackground();
  } else {
    await awaitDiscoverReady();
  }

  const q = { ...route.query };
  let stripQuery = false;
  if (queryForce && q[FORCE_FAVORITES_PICK_QUERY]) {
    delete q[FORCE_FAVORITES_PICK_QUERY];
    stripQuery = true;
  }
  if (queryRefresh) {
    delete q[FOR_YOU_REFRESH_QUERY];
    stripQuery = true;
  }
  if (stripQuery) {
    await router.replace({ name: "discover", query: q });
  }
};

const finishHandleStep = async () => {
  if (isForceHandleArmed()) advanceForceOnboardingToFavorites();
  showHandleStep.value = false;
  handleSaveError.value = null;

  // Finish any in-flight warm so Favorites cards are ready (no empty/loading grid).
  if (discoverWarmPromise) {
    loading.value = true;
    try {
      await discoverWarmPromise;
    } catch {
      // Retry below if the background warm failed.
    } finally {
      loading.value = false;
    }
    if (discoverApplied.value) return;
  }

  if (!discoverApplied.value) {
    await awaitDiscoverReady();
  }
};

const onPeekFollowee = async (wallet: string) => {
  peekWallet.value = wallet;
  peekLoading.value = true;
  peekProfile.value = null;
  const person = followingPeople.value.find((p) => p.walletAddress === wallet);
  markFollowingStripSeen(wallet, person?.lastActivityAt);
  try {
    peekProfile.value = await request<PublicProfile>(
      `/users/${encodeURIComponent(wallet)}`
    );
  } catch {
    peekProfile.value = null;
  } finally {
    peekLoading.value = false;
  }
};

const closePeek = () => {
  peekWallet.value = null;
  peekProfile.value = null;
};

const onPeekViewProfile = () => {
  const wallet = peekWallet.value;
  closePeek();
  if (wallet) goToUser(wallet);
};

const onPeekOpenTitle = (title: TitleSummary) => {
  closePeek();
  goToTitle(title.id);
};

const thankComment = (item: CommentFeedItem) => {
  if (item.thanked) return;
  useUserSendStore().offer({
    kind: "comment",
    toWallet: item.walletAddress,
    handle: item.handle,
    commentId: item.id,
  });
};

const offerCommentSend = (item: CommentFeedItem) => {
  if (!item.thanked || item.sent) return;
  useUserSendStore().offer({
    kind: "comment",
    toWallet: item.walletAddress,
    handle: item.handle,
    commentId: item.id,
  });
};

const openFindPeople = async () => {
  findPeopleOpen.value = true;
  peopleLoading.value = true;
  tourCreatorEntry.value = null;
  try {
    const res = await request<FindPeopleResponse>("/find-people").catch(
      () => ({ people: [] as FindPeopleEntry[] })
    );
    findPeople.value = res.people;
    tour.reportAction("open-find-people");

    if (tour.filterFindPeopleToCreator) {
      const existing = res.people.find((p) =>
        isTourCreatorWallet(p.walletAddress)
      );
      if (existing) {
        tourCreatorEntry.value = existing;
      } else {
        const profile = await request<PublicProfile>(
          `/users/${encodeURIComponent(TOUR_CREATOR_WALLET)}`
        ).catch(() => null);
        if (profile) {
          const movieFavoriteCount = profile.favorites.filter(
            (t) => (t.mediaType || "movie") === "movie"
          ).length;
          const tvFavoriteCount = profile.favorites.filter(
            (t) => t.mediaType === "tv"
          ).length;
          tourCreatorEntry.value = {
            walletAddress: profile.walletAddress,
            handle: profile.handle,
            movieFavoriteCount,
            tvFavoriteCount,
            thanksReceived: 0,
            isFollowing: profile.isFollowing,
          };
        } else {
          tourCreatorEntry.value = {
            walletAddress: TOUR_CREATOR_WALLET,
            handle: null,
            movieFavoriteCount: 0,
            tvFavoriteCount: 0,
            thanksReceived: 0,
            isFollowing: false,
          };
        }
      }
    }
  } finally {
    peopleLoading.value = false;
  }
};

const onOpenPersonProfile = (wallet: string) => {
  findPeopleOpen.value = false;
  if (isTourCreatorWallet(wallet)) {
    tour.reportAction("open-creator-profile");
  }
  goToUser(wallet);
};

const onFollowPerson = async (person: FindPeopleEntry) => {
  if (followBusyWallet.value) return;
  followBusyWallet.value = person.walletAddress;
  try {
    const data = await request<{ earnedAchievements?: AchievementKind[] }>(
      `/users/${encodeURIComponent(person.walletAddress)}/follow`,
      {
        method: "POST",
      }
    );
    if (data.earnedAchievements?.length) {
      useMarqueeStore().enqueue(data.earnedAchievements);
    }
    findPeople.value = findPeople.value.filter(
      (p) => p.walletAddress !== person.walletAddress
    );
    await loadFollowingPeople();
    await loadCommentFeed();
  } finally {
    followBusyWallet.value = null;
  }
};

watch(activeTab, async (tab) => {
  if (tab === "following" && mode.value === "overlap") {
    resetAppContentScroll();
    await ensureFollowingTabData();
  } else if (tab === "recommends" && mode.value === "overlap") {
    resetAppContentScroll();
    await loadCommunityRecommends();
  }
});

watch(
  () => tour.discoverTab,
  (tab) => {
    if (tab) activeTab.value = tab;
  }
);

watch(
  () => tour.step?.id,
  async (id) => {
    if (id !== "for-you") return;
    await stageTourForYou();
  },
  { immediate: true }
);

watch(
  () => tour.active,
  (active, wasActive) => {
    if (wasActive && !active && mode.value === "overlap") {
      void fetchDiscover();
    }
  }
);

watch(
  () =>
    [
      tour.active,
      tour.filterFindPeopleToCreator,
      tour.step?.id,
      tour.step?.routeName,
    ] as const,
  async ([active, filterCreator, stepId, routeName]) => {
    if (!active || routeName === "user" || stepId === "tour-done") {
      findPeopleOpen.value = false;
      return;
    }
    if (stepId === "creator-profile" || filterCreator) {
      if (!findPeopleOpen.value) await openFindPeople();
    }
  }
);

watch(
  () => [mode.value, showHandleStep.value, loading.value] as const,
  ([modeNow, handleStep, loadingNow]) => {
    if (modeNow === "overlap" && !handleStep && !loadingNow) {
      tour.maybeOfferAfterOnboarding();
    }
  }
);


async function warmUpcomingForYou(upcoming?: OverlapSuggestion[]) {
  if (!shouldPrefetchForYou(suggestions.value.length) && !(upcoming?.length)) return;
  const rows =
    upcoming ??
    (await request<ForYouUpcomingResponse>("/discover/for-you/upcoming")).suggestions;
  if (rows.length) upcomingBank.value = rows;
  const key = rows.map((row) => row.title.id).join("|");
  if (!key || key === warmedUpcomingKey) return;
  warmedUpcomingKey = key;
  await preloadImages(
    rows.map((row) => row.title.posterUrl),
    { timeoutMs: 8_000 }
  );
}

async function playForYouRefill(next: OverlapSuggestion[]) {
  const titles = next.map((item) => item.title);
  const deadline = Date.now() + PASS_COLLAPSE_MS + 80;
  while (
    document.querySelectorAll(`[${FOR_YOU_SLOT_ATTR}]`).length < titles.length &&
    Date.now() < deadline
  ) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  if (document.querySelectorAll(`[${FOR_YOU_SLOT_ATTR}]`).length < titles.length) {
    forYouMotion.beginRefill(0);
    return;
  }
  forYouMotion.playRefill(titles);
  forYouDebugLog(
    `refill n=${titles.length} slots=${
      document.querySelectorAll(`[${FOR_YOU_SLOT_ATTR}]`).length
    } pending=${forYouMotion.pendingRefillSlots.join(",") || "-"}`
  );
}

async function waitUntilForYouRefillIdle() {
  if (
    forYouMotion.pendingRefillSlots.length === 0 &&
    forYouMotion.refills.length === 0
  ) {
    return;
  }
  await new Promise<void>((resolve) => {
    const stop = watch(
      () =>
        forYouMotion.pendingRefillSlots.length + forYouMotion.refills.length,
      (n) => {
        if (n === 0) {
          stop();
          resolve();
        }
      }
    );
    window.setTimeout(() => {
      stop();
      resolve();
    }, 4000);
  });
}

async function stageTourForYou() {
  if (!tourForYouPassStep.value) return;
  try {
    const data = await request<{ suggestions: OverlapSuggestion[] }>(
      "/discover/for-you/tour-stage",
      { method: "POST" }
    );
    if (data.suggestions) suggestions.value = data.suggestions;
    warmedUpcomingKey = "";
    upcomingBank.value = [];
    await warmUpcomingForYou();
  } catch {
    // Staging is best-effort; the live set still teaches Pass.
  }
}

function playLocalForYouPass(titleId: string): boolean {
  if (!suggestions.value.some((row) => row.title.id === titleId)) return false;
  const next = applyLocalForYouPass({
    current: suggestions.value,
    passedId: titleId,
    bank: upcomingBank.value,
  });
  if (next.refilled && next.suggestions.length) {
    forYouMotion.beginRefill(next.suggestions.length);
  }
  suggestions.value = next.suggestions;
  upcomingBank.value = next.bank;
  forYouDebugLog(
    `pass ${titleId} n=${next.suggestions.length} refilled=${next.refilled ? "1" : "0"} local=1`
  );
  if (next.refilled && next.suggestions.length) {
    warmedUpcomingKey = "";
    void playForYouRefill(next.suggestions);
  }
  return true;
}

async function drainPassQueue() {
  if (drainingPasses) return;
  drainingPasses = true;
  passBusy.value = true;
  try {
    while (passQueue.length) {
      const titleId = passQueue[0]!;
      const pendingAfter = passQueue.slice(1);
      try {
        const data = await request<ForYouPassResponse>("/discover/pass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titleId }),
        });
        const reconciled = reconcileForYouPass({
          localIds: suggestions.value.map((row) => row.title.id),
          serverIds: data.suggestions.map((row) => row.title.id),
          serverRefilled: data.refilled,
          pendingPassIds: pendingAfter,
        });
        if (reconciled.adopt) {
          const byId = new Map<string, OverlapSuggestion>(
            data.suggestions.map((row) => [row.title.id, row])
          );
          const ordered = reconciled.ids.flatMap((id) => {
            const row = byId.get(id) ?? suggestions.value.find((item) => item.title.id === id);
            return row ? [row] : [];
          });
          const same =
            ordered.map((row) => row.title.id).join("|") ===
            suggestions.value.map((row) => row.title.id).join("|");
          if (data.refilled && ordered.length && !same) {
            forYouMotion.beginRefill(ordered.length);
            suggestions.value = ordered;
            await playForYouRefill(ordered);
          } else if (!same) {
            suggestions.value = ordered;
          }
        }
        if (data.upcoming?.length) {
          void warmUpcomingForYou(data.upcoming);
        }
        if (data.earnedAchievements?.length) {
          useMarqueeStore().enqueue(data.earnedAchievements);
        }
      } catch (err) {
        forYouDebugLog(
          `pass fail ${titleId} ${err instanceof Error ? err.message : String(err)}`
        );
      }
      passQueue.shift();
    }
  } finally {
    drainingPasses = false;
    passBusy.value = false;
    if (passQueue.length) void drainPassQueue();
  }
}

const onPass = async (titleId: string) => {
  if (!playLocalForYouPass(titleId)) return;
  const touring = tourForYouPassStep.value;
  if (touring) tour.setForYouPassAwaitingRefill(true);
  passQueue.push(titleId);
  try {
    if (touring) {
      await drainPassQueue();
      await waitUntilForYouRefillIdle();
      tour.reportAction("pass");
    } else {
      void drainPassQueue();
    }
  } finally {
    if (touring) tour.setForYouPassAwaitingRefill(false);
  }
};

async function dropFromLocalSet(titleId: string) {
  const remaining = suggestions.value.filter((s) => s.title.id !== titleId);
  const shouldRefill = remaining.length === 0 && suggestions.value.length > 0;
  suggestions.value = remaining;
  if (shouldRefill) {
    const data = await request<DiscoverResponse>("/discover");
    warmedUpcomingKey = "";
    if (data.suggestions?.length) {
      forYouMotion.beginRefill(data.suggestions.length);
    }
    await applyDiscoverResponse(data);
    if (data.suggestions?.length) await playForYouRefill(data.suggestions);
    return;
  }
  void warmUpcomingForYou();
}

const toggleFavorite = async (titleId: string, origin?: MouseEvent) => {
  if (tourForYouPassStep.value) return;
  const suggestion = suggestions.value.find((s) => s.title.id === titleId);
  await requestToggleFavorite(titleId, {
    title: suggestion?.title,
    isFavorited: favoritesStore.isFavorite(titleId),
    onAdded: () => {
      favoriteCount.value = favoritesStore.count;
      if (suggestion?.title) {
        titleFlight.play({
          kind: "favorite",
          title: suggestion.title,
          origin: origin ?? null,
        });
      }
      void dropFromLocalSet(titleId);
    },
  });
};

const toggleWatchlist = async (
  titleOrId: string | TitleSummary,
  origin?: MouseEvent
) => {
  if (tourForYouPassStep.value) return;
  const title =
    typeof titleOrId === "string"
      ? suggestions.value.find((s) => s.title.id === titleOrId)?.title
      : titleOrId;
  const titleId = typeof titleOrId === "string" ? titleOrId : titleOrId.id;
  await requestToggleWatchlist(titleId, {
    title,
    isWatchlisted: watchlistStore.isOnWatchlist(titleId),
    onAdded: () => {
      if (title) {
        titleFlight.play({
          kind: "watchlist",
          title,
          origin: origin ?? null,
        });
      }
      void dropFromLocalSet(titleId);
    },
  });
};

const onConfirmAction = async () => {
  await confirmPending({
    onUnfavorite: () => {
      favoriteCount.value = favoritesStore.count;
    },
  });
};

const goToTitle = (titleId: string, expandOverview = false) => {
  if (!tourAllowsTitleNavigation(tour.step)) return;
  tour.reportAction("open-title", { titleId });
  router.push({
    name: "title",
    params: { id: titleId },
    ...(expandOverview ? { query: { overview: "1" } } : {}),
  });
};

const goToTitleOverview = (titleId: string) => {
  goToTitle(titleId, true);
};

const goToTitleSummary = (title: TitleSummary) => {
  goToTitle(title.id);
};

const goToUser = (wallet: string) => {
  if (!tourAllowsUserNavigation(tour.step, wallet)) return;
  router.push({ name: "user", params: { wallet } });
};


const onOnboardingContinue = async (titleIds: string[]) => {
  if (onboardingBusy.value) return;
  onboardingBusy.value = true;
  onboardingSaveError.value = null;
  try {
    clearForceOnboardingFlow();
    await favoritesStore.addMany(titleIds);
    favoriteCount.value = favoritesStore.count;
    await awaitDiscoverReady();
    tour.maybeOfferAfterOnboarding();
  } catch {
    onboardingSaveError.value = "Could not save favorites. Try again.";
  } finally {
    onboardingBusy.value = false;
  }
};

const onOnboardingSkip = async () => {
  if (onboardingBusy.value) return;
  onboardingBusy.value = true;
  onboardingSaveError.value = null;
  try {
    clearForceOnboardingFlow();
    const data = await request<DiscoverResponse>("/discover/skip-onboarding", {
      method: "POST",
    });
    await applyDiscoverResponse(data);
    tour.maybeOfferAfterOnboarding();
  } catch {
    onboardingSaveError.value = "Could not skip. Try again.";
  } finally {
    onboardingBusy.value = false;
  }
};

const onHandleContinue = async (handle: string) => {
  if (handleBusy.value) return;
  handleBusy.value = true;
  handleSaveError.value = null;
  try {
    await authStore.setHandle(handle);
    await finishHandleStep();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save handle.";
    handleSaveError.value = mapHandleSaveError(message);
  } finally {
    handleBusy.value = false;
  }
};

let skipNextActivateLoad = false;

onMounted(() => {
  skipNextActivateLoad = true;
  void loadDiscover();
});

onActivated(() => {
  if (skipNextActivateLoad) {
    skipNextActivateLoad = false;
    return;
  }
  if (isForYouRefreshQuery(route.query)) {
    void loadDiscover();
  }
});
</script>

<style scoped>
.discover {
  padding-bottom: 2rem;
}

.discover--onboarding,
.discover--handle {
  padding-bottom: 0;
}

.discover--overlap {
  --discover-feed-tabs-height: 2.85rem;
  padding-bottom: calc(var(--discover-feed-tabs-height) + 0.75rem);
}

.discover--for-you {
  padding-bottom: 0;
}

.discover--overlap:not(.discover--for-you) .discover-body {
  padding-top: 0.35rem;
  gap: 0.85rem;
}

.discover--for-you .discover-body {
  padding: 0;
  gap: 0;
}

.discover--recommends .discover-body {
  padding-top: 0.75rem;
}

.recommends-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.discover-feed-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--bottom-tabs-inset);
  z-index: 45;
  display: flex;
  justify-content: center;
  background: rgba(10, 10, 15, 0.92);
  border-top: 1px solid var(--border);
  touch-action: none;
  overscroll-behavior: none;
  will-change: transform;
}

/* Sit above the shell tab bar so the tour outline is not clipped. */
.discover-feed-tabs--tour-glow {
  z-index: 55;
  overflow: visible;
}

/* Rise with the shell tab bar after Favorites onboarding (Continue / Skip) */
.feed-tabs-slide-enter-active {
  transition: transform 0.38s cubic-bezier(0.25, 0, 0, 1);
}

.feed-tabs-slide-enter-from {
  transform: translateY(calc(100% + var(--bottom-tabs-bar-height, 4.5rem)));
}

.feed-tabs-slide-enter-to {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .feed-tabs-slide-enter-active {
    transition: none;
  }
}

.discover-feed-tabs-inner {
  width: 100%;
  max-width: var(--column-max);
  padding-inline: var(--column-pad);
  box-sizing: border-box;
}

.discover-tabs {
  display: flex;
  gap: 0;
}

.discover-tabs :deep(.gold-glow-shell) {
  flex: 1;
  min-width: 0;
}

.discover-tabs :deep(.gold-glow-content) {
  display: flex;
  width: 100%;
}

.discover-tabs :deep(.discover-tab) {
  width: 100%;
}

.discover-tab {
  flex: 1;
  position: relative;
  padding: 0.75rem 0.5rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.discover-tab.active {
  color: var(--gold);
}

.discover-tab.active::after {
  content: "";
  position: absolute;
  left: 20%;
  right: 20%;
  top: 0;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: var(--gold);
}

.discover-tab:active {
  opacity: 0.85;
}

.loading {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}








.discover-body {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feed-empty {
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
