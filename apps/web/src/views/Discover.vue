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
  >
    <div v-if="loading && !showHandleStep" class="loading">
      <NqSpinner />
    </div>

    <HandleOnboarding
      v-else-if="showHandleStep"
      :wallet-address="authStore.user?.walletAddress ?? null"
      :initial-handle="isForceHandleArmed() ? authStore.user?.handle : null"
      :busy="handleBusy"
      :save-error="handleSaveError"
      @continue="onHandleContinue"
    />

    <FavoritesOnboarding
      v-else-if="mode === 'onboarding'"
      :candidates="onboardingCandidates"
      :min-favorites="minFavorites"
      :busy="onboardingBusy"
      @continue="onOnboardingContinue"
      @skip="onOnboardingSkip"
    />

    <div v-else class="discover-body">
      <FollowingStrip
        v-if="activeTab === 'following'"
        :people="followingPeople"
        :selected-wallet="selectedFollowee"
        @select="onSelectFollowee"
        @find-people="openFindPeople"
      />

      <section v-if="activeTab === 'for-you'" class="suggestions-section">
        <div v-if="suggestions.length === 0" class="feed-empty">
          No overlap suggestions yet — favorite a few more titles.
        </div>

        <ForYouPicker
          v-else
          :suggestions="suggestions"
          :is-favorite="favoritesStore.isFavorite"
          :is-on-watchlist="watchlistStore.isOnWatchlist"
          dock-bottom-offset="var(--discover-feed-tabs-height, 2.85rem)"
          @toggle-favorite="toggleFavorite"
          @toggle-watchlist="toggleWatchlist"
          @open="goToTitle"
          @open-overview="goToTitleOverview"
        />
      </section>

      <section v-else-if="activeTab === 'recommends'" class="recommends-section">
        <div v-if="communityLoading && !communityLoaded" class="feed-empty">
          Loading Recommends…
        </div>
        <div
          v-else-if="!communityMovies.length && !communityTv.length"
          class="feed-empty"
        >
          No community Recommends yet.
        </div>
        <CommunityRecommends
          v-else
          :movies="communityMovies"
          :tv="communityTv"
          heading="What others on Cinima recommend"
          :max-rows="4"
          tour-first-poster
          @select="goToTitleSummary"
        />
      </section>

      <section v-else class="feed-section">
        <div v-if="followingPeople.length === 0" class="feed-empty">
          Tap Find people above to follow Handles and see their recent Favorites here.
        </div>
        <div v-else-if="feed.length === 0" class="feed-empty">
          No recent Favorites or unlocks from this Handle yet.
        </div>

        <div v-else class="feed-list">
          <article
            v-for="card in feedCards"
            :key="card.key"
            class="feed-item"
          >
            <button type="button" class="feed-user" @click="goToUser(card.walletAddress)">
              <Identicon :address="card.walletAddress" :size="36" alt="" />
              <div class="feed-user-text">
                <strong>{{ displayName(card.handle, card.walletAddress) }}</strong>
                <span>{{ card.subtitle }} · {{ relativeTime(card.createdAt) }}</span>
              </div>
            </button>

            <div v-if="card.titles.length === 1" class="feed-single">
              <button type="button" class="feed-title" @click="goToTitle(card.titles[0]!.id)">
                <div class="feed-thumb poster-press">
                  <PosterImg
                    v-if="card.titles[0]!.posterUrl"
                    :src="card.titles[0]!.posterUrl"
                    :alt="card.titles[0]!.title"
                    :spinner-size="22"
                  />
                  <div v-else class="poster-fallback">{{ card.titles[0]!.title }}</div>
                </div>
                <div class="feed-title-meta">
                  <strong>{{ card.titles[0]!.title }}</strong>
                  <span>{{ card.titles[0]!.year }} · {{ card.titles[0]!.mediaType }}</span>
                </div>
              </button>
            </div>

            <div v-else class="feed-posters">
              <button
                v-for="title in card.titles"
                :key="title.id"
                type="button"
                class="feed-poster poster-press"
                :title="title.title"
                @click="goToTitle(title.id)"
              >
                <PosterImg
                  v-if="title.posterUrl"
                  :src="title.posterUrl"
                  :alt="title.title"
                  :spinner-size="22"
                />
                <span v-else>{{ title.title.slice(0, 1) }}</span>
              </button>
            </div>
          </article>
        </div>
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
                Following
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

    <ConfirmDialog
      v-if="pendingConfirm"
      :message="confirmMessage"
      @cancel="cancelConfirm"
      @confirm="onConfirmAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
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
import { displayName } from "@cinima/shared";
import type {
  DiscoverResponse,
  FollowingFeedItem,
  FollowingFeedResponse,
  FollowingPeopleResponse,
  FollowingPerson,
  OverlapSuggestion,
  FindPeopleEntry,
  FindPeopleResponse,
  PublicProfile,
  TitleSummary,
} from "@cinima/shared";
import FavoritesOnboarding from "@/components/FavoritesOnboarding.vue";
import HandleOnboarding from "@/components/HandleOnboarding.vue";
import {
  mapHandleSaveError,
  shouldOfferHandleOnboarding,
} from "@/lib/handleOnboarding";
import { preloadImages } from "@/lib/preloadImages";
import { useAuthStore } from "@/stores/auth";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import CommunityRecommends from "@/components/CommunityRecommends.vue";
import FindPeopleSheet from "@/components/FindPeopleSheet.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import {
  TOUR_CREATOR_WALLET,
  TOUR_SPOTLIGHT,
  isTourCreatorWallet,
} from "@/lib/guidedTour";
import { useGuidedTourStore } from "@/stores/guidedTour";
import FollowingStrip from "@/components/FollowingStrip.vue";
import Identicon from "@/components/Identicon.vue";
import ForYouPicker from "@/components/ForYouPicker.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import PosterImg from "@/components/PosterImg.vue";
import {
  loadFollowingStripSeen,
  markFollowingStripSeen,
  sortFollowingStripPeople,
} from "@/lib/followingStrip";
import { useCommunityRecommends } from "@/composables/useCommunityRecommends";
import { useTitleActionConfirm } from "@/composables/useTitleActionConfirm";

defineOptions({ name: "Discover" });

type FeedCard = {
  key: string;
  type: "favorite" | "unlock";
  walletAddress: string;
  handle: string | null;
  titles: TitleSummary[];
  createdAt: string;
  subtitle: string;
};

const router = useRouter();
const route = useRoute();
const { request } = useApi();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const tour = useGuidedTourStore();
const tourFeedTabGlow = computed(
  () =>
    tour.isSpotlight(TOUR_SPOTLIGHT.discoverTabForYou) ||
    tour.isSpotlight(TOUR_SPOTLIGHT.discoverTabRecommends) ||
    tour.isSpotlight(TOUR_SPOTLIGHT.discoverTabFollowing)
);
const {
  pendingConfirm,
  confirmMessage,
  cancelConfirm,
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
const favoriteCount = ref(0);
const minFavorites = ref(3);
const onboardingCandidates = ref<TitleSummary[]>([]);
const onboardingBusy = ref(false);
const showHandleStep = ref(false);
const handleBusy = ref(false);
const handleSaveError = ref<string | null>(null);
const suggestions = ref<OverlapSuggestion[]>([]);
const feed = ref<FollowingFeedItem[]>([]);
const followingPeople = ref<FollowingPerson[]>([]);
const selectedFollowee = ref<string | null>(null);
const findPeopleOpen = ref(false);
const findPeople = ref<FindPeopleEntry[]>([]);
const peopleLoading = ref(false);
const followBusyWallet = ref<string | null>(null);
const followingStripReady = ref(false);
/** True once a discover response has been applied (possibly while Handle was open). */
const discoverApplied = ref(false);
/** Creator row injected when Find people is filtered for the guided tour. */
const tourCreatorEntry = ref<FindPeopleEntry | null>(null);

const visibleFindPeople = computed(() => {
  if (!tour.filterFindPeopleToCreator) return findPeople.value;
  if (tourCreatorEntry.value) return [tourCreatorEntry.value];
  const fromList = findPeople.value.filter((p) =>
    isTourCreatorWallet(p.walletAddress)
  );
  return fromList;
});

/** Merge a user's favorites into one card; unlocks stay one-per-title. */
const feedCards = computed((): FeedCard[] => {
  const favoritesByWallet = new Map<
    string,
    { handle: string | null; titles: TitleSummary[]; createdAt: string; seen: Set<string> }
  >();
  const unlocks: FeedCard[] = [];

  for (const item of feed.value) {
    if (item.type === "unlock") {
      unlocks.push({
        key: `unlock-${item.walletAddress}-${item.title.id}-${item.createdAt}`,
        type: "unlock",
        walletAddress: item.walletAddress,
        handle: item.handle,
        titles: [item.title],
        createdAt: item.createdAt,
        subtitle: "unlocked",
      });
      continue;
    }

    let group = favoritesByWallet.get(item.walletAddress);
    if (!group) {
      group = {
        handle: item.handle,
        titles: [],
        createdAt: item.createdAt,
        seen: new Set(),
      };
      favoritesByWallet.set(item.walletAddress, group);
    }
    if (!group.seen.has(item.title.id)) {
      group.seen.add(item.title.id);
      group.titles.push(item.title);
    }
    if (item.createdAt > group.createdAt) group.createdAt = item.createdAt;
    if (!group.handle && item.handle) group.handle = item.handle;
  }

  const favoriteCards: FeedCard[] = [...favoritesByWallet.entries()].map(([wallet, g]) => ({
    key: `fav-${wallet}`,
    type: "favorite",
    walletAddress: wallet,
    handle: g.handle,
    titles: g.titles,
    createdAt: g.createdAt,
    subtitle:
      g.titles.length === 1
        ? "favorited"
        : `favorited ${g.titles.length} titles`,
  }));

  return [...favoriteCards, ...unlocks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const loadFollowingPeople = async () => {
  const res = await request<FollowingPeopleResponse>("/following").catch(
    () => ({ people: [] as FollowingPerson[] })
  );
  const sorted = sortFollowingStripPeople(res.people, loadFollowingStripSeen());
  followingPeople.value = sorted;
  if (
    selectedFollowee.value &&
    !sorted.some((p) => p.walletAddress === selectedFollowee.value)
  ) {
    selectedFollowee.value = sorted[0]?.walletAddress ?? null;
  } else if (!selectedFollowee.value && sorted.length) {
    selectedFollowee.value = sorted[0]!.walletAddress;
  }
  followingStripReady.value = true;
};

const loadFolloweeFeed = async (wallet: string | null) => {
  if (!wallet) {
    feed.value = [];
    return;
  }
  const feedRes = await request<FollowingFeedResponse>(
    `/feed?followee=${encodeURIComponent(wallet)}`
  ).catch(() => ({ items: [] as FollowingFeedItem[] }));
  feed.value = feedRes.items;
  const person = followingPeople.value.find((p) => p.walletAddress === wallet);
  // Record seen now; strip order updates when the viewer leaves Following and returns.
  markFollowingStripSeen(wallet, person?.lastActivityAt);
};

const applyFollowingStripOrder = () => {
  if (!followingPeople.value.length) return;
  followingPeople.value = sortFollowingStripPeople(
    followingPeople.value,
    loadFollowingStripSeen()
  );
};

const ensureFollowingTabData = async () => {
  if (!followingStripReady.value) {
    await loadFollowingPeople();
  } else {
    applyFollowingStripOrder();
  }
  await loadFolloweeFeed(selectedFollowee.value);
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
  }
  discoverApplied.value = true;
};

const fetchDiscover = async () => {
  const forcePick = canForceFavoritesPick() && isForceOnboardingArmed();
  const discoverPath = forcePick ? "/discover?forceOnboarding=1" : "/discover";
  const data = await request<DiscoverResponse>(discoverPath);
  await applyDiscoverResponse(data);
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
  if (queryForce) {
    armForceOnboardingFlow();
  }

  syncHandleStep();

  if (showHandleStep.value) {
    // Username first: show Handle immediately and warm Favorites cards behind it.
    loading.value = false;
    void warmDiscoverInBackground();
  } else {
    await awaitDiscoverReady();
  }

  if (queryForce && route.query[FORCE_FAVORITES_PICK_QUERY]) {
    const q = { ...route.query };
    delete q[FORCE_FAVORITES_PICK_QUERY];
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

const onSelectFollowee = async (wallet: string) => {
  if (selectedFollowee.value === wallet) return;
  selectedFollowee.value = wallet;
  await loadFolloweeFeed(wallet);
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
    await request(`/users/${encodeURIComponent(person.walletAddress)}/follow`, {
      method: "POST",
    });
    findPeople.value = findPeople.value.filter(
      (p) => p.walletAddress !== person.walletAddress
    );
    await loadFollowingPeople();
    if (!selectedFollowee.value && followingPeople.value.length) {
      selectedFollowee.value = followingPeople.value[0]!.walletAddress;
    }
    if (selectedFollowee.value) {
      await loadFolloweeFeed(selectedFollowee.value);
    }
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
  () =>
    [
      tour.active,
      tour.filterFindPeopleToCreator,
      tour.step?.id,
    ] as const,
  async ([active, filterCreator, stepId]) => {
    if (!active || stepId === "creator-taste" || stepId === "tour-done") {
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


const toggleFavorite = async (titleId: string) => {
  const suggestion = suggestions.value.find((s) => s.title.id === titleId);
  await requestToggleFavorite(titleId, {
    title: suggestion?.title,
    isFavorited: favoritesStore.isFavorite(titleId),
    onAdded: () => {
      favoriteCount.value = favoritesStore.count;
    },
  });
};

const toggleWatchlist = async (titleOrId: string | TitleSummary) => {
  const title =
    typeof titleOrId === "string"
      ? suggestions.value.find((s) => s.title.id === titleOrId)?.title
      : titleOrId;
  const titleId = typeof titleOrId === "string" ? titleOrId : titleOrId.id;
  await requestToggleWatchlist(titleId, {
    title,
    isWatchlisted: watchlistStore.isOnWatchlist(titleId),
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
  router.push({ name: "user", params: { wallet } });
};


const onOnboardingContinue = async (titleIds: string[]) => {
  if (onboardingBusy.value) return;
  onboardingBusy.value = true;
  try {
    clearForceOnboardingFlow();
    await favoritesStore.addMany(titleIds);
    favoriteCount.value = favoritesStore.count;
    await awaitDiscoverReady();
    tour.maybeOfferAfterOnboarding();
  } finally {
    onboardingBusy.value = false;
  }
};

const onOnboardingSkip = async () => {
  if (onboardingBusy.value) return;
  onboardingBusy.value = true;
  try {
    clearForceOnboardingFlow();
    const data = await request<DiscoverResponse>("/discover/skip-onboarding", {
      method: "POST",
    });
    await applyDiscoverResponse(data);
    tour.maybeOfferAfterOnboarding();
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

onMounted(() => {
  void loadDiscover();
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

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feed-item {
  background: var(--bg-surface);
  border-radius: 14px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.feed-user,
.feed-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  padding: 0;
  width: 100%;
}

.feed-user-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.feed-user-text strong {
  color: var(--text-primary);
  font-size: 0.95rem;
}

.feed-user-text span {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.feed-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  padding: 0;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
}

.feed-thumb {
  width: 44px;
  height: 66px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.feed-thumb img,
.poster-fallback {
  width: 100%;
  height: 100%;
  border-radius: 0;
  object-fit: cover;
  background: var(--bg-primary);
  display: block;
}

.poster-fallback {
  display: grid;
  place-items: center;
  font-size: 0.55rem;
  color: var(--text-secondary);
  padding: 0.25rem;
  text-align: center;
}

.feed-title-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.feed-title-meta strong {
  color: var(--text-primary);
}

.feed-title-meta span {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.feed-posters {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  -webkit-overflow-scrolling: touch;
}

.feed-poster {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 66px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-primary);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  -webkit-tap-highlight-color: transparent;
}

.feed-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.feed-poster span {
  display: grid;
  place-items: center;
  height: 100%;
}
</style>
