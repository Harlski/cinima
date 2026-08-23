<template>
  <div
    class="discover"
    :class="{
      'discover--overlap': !loading && mode === 'overlap',
      'discover--for-you': !loading && mode === 'overlap' && activeTab === 'for-you',
    }"
  >
    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

    <div v-else-if="mode === 'onboarding'" class="onboarding">
      <div class="onboarding-prompt">
        <h2>Pick your favorites</h2>
        <p>
          Add at least {{ minFavorites }} titles to unlock personalized
          suggestions
        </p>
        <div class="progress nq-pill-blue">
          {{ favoriteCount }} / {{ minFavorites }}
        </div>
      </div>

      <div class="search-box">
        <input
          v-model="searchQuery"
          @input="onSearch"
          type="text"
          placeholder="Search titles..."
          class="search-input nq-input-box"
        />
      </div>

      <div class="results">
        <TitleCard
          v-for="title in searchResults"
          :key="title.id"
          variant="horizontal"
          :title="title"
          :favorited="favoritesStore.isFavorite(title.id)"
          :watchlisted="watchlistStore.isOnWatchlist(title.id)"
          @toggle-favorite="toggleFavorite"
          @toggle-watchlist="toggleWatchlist"
          @click="goToTitle(title.id)"
        />
      </div>
    </div>

    <div v-else class="discover-body">
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
        <div v-if="feed.length === 0" class="feed-empty">
          Follow curators from a title’s suggesters or profiles to see their new favorites and unlocks here.
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useFavoritesStore } from "@/stores/favorites";
import { useWatchlistStore } from "@/stores/watchlist";
import { useCatalogStore } from "@/stores/catalog";
import { displayName } from "@cinima/shared";
import type {
  DiscoverResponse,
  FollowingFeedItem,
  FollowingFeedResponse,
  OverlapSuggestion,
  TitleSummary,
} from "@cinima/shared";
import TitleCard from "@/components/TitleCard.vue";
import Identicon from "@/components/Identicon.vue";
import ForYouPicker from "@/components/ForYouPicker.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import PosterImg from "@/components/PosterImg.vue";

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
const { request } = useApi();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const catalogStore = useCatalogStore();

const loading = ref(true);
const mode = ref<"onboarding" | "overlap">("onboarding");
const activeTab = ref<"for-you" | "following">("for-you");
const favoriteCount = ref(0);
const minFavorites = ref(3);
const searchQuery = ref("");
const searchResults = ref<any[]>([]);
const suggestions = ref<OverlapSuggestion[]>([]);
const feed = ref<FollowingFeedItem[]>([]);

let searchTimeout: ReturnType<typeof setTimeout>;

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

const loadDiscover = async () => {
  loading.value = true;
  try {
    const [data, feedRes] = await Promise.all([
      request<DiscoverResponse>("/discover"),
      request<FollowingFeedResponse>("/feed").catch(() => ({ items: [] as FollowingFeedItem[] })),
    ]);
    mode.value = data.mode;
    favoriteCount.value = data.favoriteCount;
    minFavorites.value = data.minFavorites;
    feed.value = feedRes.items;

    if (data.mode === "onboarding" && data.onboardingCandidates) {
      searchResults.value = data.onboardingCandidates;
    } else if (data.mode === "overlap" && data.suggestions) {
      suggestions.value = data.suggestions;
    }
  } finally {
    loading.value = false;
  }
};

const onSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (searchQuery.value.trim()) {
      searchResults.value = await catalogStore.search(searchQuery.value);
    } else {
      loadDiscover();
    }
  }, 300);
};

const toggleFavorite = async (titleId: string) => {
  await favoritesStore.toggle(titleId);
  favoriteCount.value = favoritesStore.count;

  if (mode.value === "onboarding" && favoriteCount.value >= minFavorites.value) {
    await loadDiscover();
  }
};

const toggleWatchlist = async (titleOrId: string | TitleSummary) => {
  if (typeof titleOrId === "string") {
    const suggestion = suggestions.value.find((s) => s.title.id === titleOrId);
    await watchlistStore.toggle(titleOrId, suggestion?.title);
    return;
  }
  await watchlistStore.toggle(titleOrId.id, titleOrId);
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

const goToUser = (wallet: string) => {
  router.push({ name: "user", params: { wallet } });
};

onMounted(() => {
  loadDiscover();
});
</script>

<style scoped>
.discover {
  padding-bottom: 2rem;
}

.discover--overlap {
  --discover-feed-tabs-height: 2.85rem;
  padding-bottom: calc(var(--discover-feed-tabs-height) + 0.75rem);
}

.discover--for-you {
  padding-bottom: 0;
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

.onboarding-prompt {
  padding: 2rem 0;
  text-align: center;
  background: var(--bg-surface);
}

.onboarding-prompt h2 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.onboarding-prompt p {
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
}

.progress {
  display: inline-flex;
}

.search-box {
  padding: 1rem 0;
}

.search-input {
  width: 100%;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0 0 1rem;
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
