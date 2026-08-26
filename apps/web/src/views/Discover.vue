<template>
  <div
    class="discover"
    :class="{
      'discover--onboarding': mode === 'onboarding',
      'discover--overlap': !loading && mode === 'overlap',
      'discover--for-you': !loading && mode === 'overlap' && activeTab === 'for-you',
    }"
  >
    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

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
        v-if="!loading && mode === 'overlap'"
        class="discover-feed-tabs"
        aria-label="Discover feeds"
      >
        <div class="discover-feed-tabs-inner">
          <div class="discover-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              class="discover-tab"
              :class="{ active: activeTab === 'for-you' }"
              :aria-selected="activeTab === 'for-you'"
              @click="activeTab = 'for-you'"
            >
              For You
            </button>
            <button
              type="button"
              role="tab"
              class="discover-tab"
              :class="{ active: activeTab === 'following' }"
              :aria-selected="activeTab === 'following'"
              @click="activeTab = 'following'"
            >
              Following
            </button>
          </div>
        </div>
      </nav>
    </Transition>

    <FindPeopleSheet
      v-if="findPeopleOpen"
      :people="findPeople"
      :loading="peopleLoading"
      :busy-wallet="followBusyWallet"
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
import { FORCE_FAVORITES_PICK_QUERY, canForceFavoritesPick } from "@/lib/welcome";
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
  TitleSummary,
} from "@cinima/shared";
import FavoritesOnboarding from "@/components/FavoritesOnboarding.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import FindPeopleSheet from "@/components/FindPeopleSheet.vue";
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
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
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
const activeTab = ref<"for-you" | "following">("for-you");
const favoriteCount = ref(0);
const minFavorites = ref(3);
const onboardingCandidates = ref<TitleSummary[]>([]);
const onboardingBusy = ref(false);
const suggestions = ref<OverlapSuggestion[]>([]);
const feed = ref<FollowingFeedItem[]>([]);
const followingPeople = ref<FollowingPerson[]>([]);
const selectedFollowee = ref<string | null>(null);
const findPeopleOpen = ref(false);
const findPeople = ref<FindPeopleEntry[]>([]);
const peopleLoading = ref(false);
const followBusyWallet = ref<string | null>(null);
const followingStripReady = ref(false);

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

const loadDiscover = async () => {
  loading.value = true;
  try {
    const forcePick =
      canForceFavoritesPick() &&
      String(route.query[FORCE_FAVORITES_PICK_QUERY] ?? "") === "1";
    const discoverPath = forcePick ? "/discover?forceOnboarding=1" : "/discover";

    const data = await request<DiscoverResponse>(discoverPath);
    mode.value = data.mode;
    favoriteCount.value = data.favoriteCount;
    minFavorites.value = data.minFavorites;

    if (data.mode === "onboarding" && data.onboardingCandidates) {
      onboardingCandidates.value = data.onboardingCandidates;
    } else if (data.mode === "overlap" && data.suggestions) {
      suggestions.value = data.suggestions;
      followingStripReady.value = false;
      if (activeTab.value === "following") {
        await ensureFollowingTabData();
      }
    }

    if (forcePick && route.query[FORCE_FAVORITES_PICK_QUERY]) {
      const q = { ...route.query };
      delete q[FORCE_FAVORITES_PICK_QUERY];
      await router.replace({ name: "discover", query: q });
    }
  } finally {
    loading.value = false;
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
  try {
    const res = await request<FindPeopleResponse>("/find-people").catch(
      () => ({ people: [] as FindPeopleEntry[] })
    );
    findPeople.value = res.people;
  } finally {
    peopleLoading.value = false;
  }
};

const onOpenPersonProfile = (wallet: string) => {
  findPeopleOpen.value = false;
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
  }
});


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

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

const goToUser = (wallet: string) => {
  router.push({ name: "user", params: { wallet } });
};


const onOnboardingContinue = async (titleIds: string[]) => {
  if (onboardingBusy.value) return;
  onboardingBusy.value = true;
  try {
    await favoritesStore.addMany(titleIds);
    favoriteCount.value = favoritesStore.count;
    await loadDiscover();
  } finally {
    onboardingBusy.value = false;
  }
};

const onOnboardingSkip = async () => {
  if (onboardingBusy.value) return;
  onboardingBusy.value = true;
  try {
    const data = await request<DiscoverResponse>("/discover/skip-onboarding", {
      method: "POST",
    });
    mode.value = data.mode;
    favoriteCount.value = data.favoriteCount;
    minFavorites.value = data.minFavorites;
    if (data.mode === "overlap" && data.suggestions) {
      suggestions.value = data.suggestions;
      followingStripReady.value = false;
      if (activeTab.value === "following") {
        await ensureFollowingTabData();
      }
    }
  } finally {
    onboardingBusy.value = false;
  }
};

onMounted(() => {
  loadDiscover();
});
</script>

<style scoped>
.discover {
  padding-bottom: 2rem;
}

.discover--onboarding {
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
