<template>
  <div class="discover">
    <header
      v-if="!loading && mode === 'overlap'"
      class="page-header"
    >
      <div
        class="discover-tabs"
        role="tablist"
        aria-label="Discover feeds"
      >
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
    </header>

    <div v-if="loading" class="loading">Loading...</div>

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
          @toggle-favorite="toggleFavorite"
          @click="goToTitle(title.id)"
        />
      </div>
    </div>

    <div v-else class="discover-body">
      <section v-if="activeTab === 'for-you'" class="suggestions-section">
        <div v-if="suggestions.length === 0" class="feed-empty">
          No overlap suggestions yet — favorite a few more titles.
        </div>

        <div v-else class="suggestions">
          <div
            v-for="suggestion in suggestions"
            :key="suggestion.title.id"
            class="suggestion-card"
            @click="handleSuggestionClick(suggestion)"
          >
            <div class="card-poster poster-press">
              <img
                v-if="suggestion.title.posterUrl"
                :src="suggestion.title.posterUrl"
                :alt="suggestion.title.title"
              />
              <div v-else class="poster-placeholder">
                {{ suggestion.title.title.slice(0, 1) }}
              </div>
            </div>
            <div class="card-info">
              <h3>{{ suggestion.title.title }}</h3>
              <p class="card-meta">
                {{ suggestion.title.year }} · {{ suggestion.title.mediaType }}
              </p>
              <div v-if="suggestion.sampleWallets.length" class="card-liked">
                <NqIcon name="heart" :size="16" class="thumb" />
                <div class="liked-faces">
                  <Identicon
                    v-for="wallet in suggestion.sampleWallets.slice(0, 3)"
                    :key="wallet"
                    class="liked-face"
                    :address="wallet"
                    :size="22"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
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
                  <img
                    v-if="card.titles[0]!.posterUrl"
                    :src="card.titles[0]!.posterUrl"
                    :alt="card.titles[0]!.title"
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
                <img v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
                <span v-else>{{ title.title.slice(0, 1) }}</span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useFavoritesStore } from "@/stores/favorites";
import { useCatalogStore } from "@/stores/catalog";
import { displayName } from "@nimcharts/shared";
import type {
  DiscoverResponse,
  FollowingFeedItem,
  FollowingFeedResponse,
  OverlapSuggestion,
  TitleSummary,
} from "@nimcharts/shared";
import TitleCard from "@/components/TitleCard.vue";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";

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

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

const goToUser = (wallet: string) => {
  router.push({ name: "user", params: { wallet } });
};

const handleSuggestionClick = (suggestion: OverlapSuggestion) => {
  router.push({ name: "title", params: { id: suggestion.title.id } });
};

onMounted(() => {
  loadDiscover();
});
</script>

<style scoped>
.discover {
  padding-bottom: 2rem;
}

.page-header {
  padding: 0.25rem 1rem 0;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
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
  color: var(--text-primary);
}

.discover-tab.active::after {
  content: "";
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--primary);
}

.discover-tab:active {
  opacity: 0.85;
}

.loading {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.onboarding-prompt {
  padding: 2rem 1rem;
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
  padding: 1rem;
}

.search-input {
  width: 100%;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0 1rem 1rem;
}

.discover-body {
  padding: 1rem;
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

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.suggestion-card {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  background: var(--bg-surface);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  padding: 0.55rem;
  -webkit-tap-highlight-color: transparent;
}

.suggestion-card:active {
  background: var(--bg-surface);
}

.suggestion-card:active .card-poster.poster-press::after {
  opacity: 1;
}

.card-poster {
  position: relative;
  width: 52px;
  height: 78px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-primary);
}

.card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-weight: 700;
}

.card-info {
  flex: 1;
  min-width: 0;
  padding: 0;
}

.card-info h3 {
  margin: 0 0 0.2rem 0;
  font-size: 0.98rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  margin: 0 0 0.45rem 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.card-liked {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.thumb {
  color: var(--primary);
  flex-shrink: 0;
}

.liked-faces {
  display: flex;
  align-items: center;
}

.liked-face {
  margin-left: -6px;
  box-shadow: 0 0 0 1.5px var(--bg-surface);
  border-radius: 50%;
}

.liked-face:first-child {
  margin-left: 0;
}
</style>
