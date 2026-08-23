<template>
  <div class="search">
    <div class="search-stage" :style="searchStageStyle">
      <div class="search-stage-inner">
        <div v-if="!showHistory && loading" class="loading">
          <NqSpinner label="Searching" />
        </div>

        <div
          v-else-if="!showHistory && searchQuery && results.length === 0"
          class="empty"
        >
          No results found
        </div>

        <div v-else-if="!showHistory" ref="resultsEl" class="results">
          <TitleCard
            v-for="title in displayedResults"
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
    </div>

    <div ref="searchDockEl" class="search-dock" :style="searchDockStyle">
      <div class="search-dock-inner">
        <div v-if="showHistory" class="history">
          <div class="history-head">
            <h2>Recent searches</h2>
            <button
              v-if="history.length"
              type="button"
              class="clear-btn"
              @click="clearHistory"
            >
              Clear
            </button>
          </div>

          <div v-if="history.length === 0" class="history-empty">
            Your recent searches will show up here
          </div>

          <ul v-else ref="historyListEl" class="history-list">
            <li v-for="item in historyOldestFirst" :key="item" class="history-item">
              <button type="button" class="history-query" @click="runHistory(item)">
                <NqIcon name="sand-clock" :size="18" class="history-ico" />
                <span>{{ item }}</span>
              </button>
              <button
                type="button"
                class="history-remove"
                :aria-label="`Remove ${item}`"
                @click="removeHistory(item)"
              >
                <NqIcon name="cross" :size="14" />
              </button>
            </li>
          </ul>
        </div>

        <form class="search-bar" @submit.prevent="onSubmit">
          <div
            v-if="!showHistory"
            class="search-sort"
            role="radiogroup"
            aria-label="Sort search results"
          >
            <button
              v-for="option in sortOptions"
              :key="option.key"
              type="button"
              role="radio"
              class="search-sort-btn"
              :class="{ active: sortKey === option.key }"
              :aria-checked="sortKey === option.key"
              @click="setSort(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="search-box">
            <NqIcon name="magnifying-glass" :size="20" class="search-ico" />
            <input
              v-model="searchQuery"
              @input="onSearch"
              type="search"
              enterkeyhint="search"
              autocomplete="off"
              placeholder="Search movies & TV shows..."
              class="search-input"
              autofocus
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear"
              aria-label="Clear search"
              @click="clearQuery"
            >
              <NqIcon name="cross" :size="14" />
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFavoritesStore } from "@/stores/favorites";
import { useWatchlistStore } from "@/stores/watchlist";
import { useCatalogStore } from "@/stores/catalog";
import TitleCard from "@/components/TitleCard.vue";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
  removeSearchHistoryItem,
} from "@/lib/searchHistory";
import { parseSearchQuery, searchRouteQuery } from "@/lib/searchQuery";
import {
  loadSearchResults,
  saveSearchResults,
} from "@/lib/searchResultsCache";
import {
  searchDockBottomPx,
  searchStageBox,
  type SearchChrome,
  type VisualViewportBox,
} from "@/lib/searchViewport";
import {
  loadSearchSort,
  saveSearchSort,
  sortSearchResults,
  type SearchSortKey,
} from "@/lib/searchSort";
import type { TitleSummary } from "@cinima/shared";

const route = useRoute();
const router = useRouter();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const catalogStore = useCatalogStore();

const searchQuery = ref(parseSearchQuery(route.query.q));
const results = ref<TitleSummary[]>(
  loadSearchResults(searchQuery.value) ?? []
);
const loading = ref(false);
const history = ref<string[]>(loadSearchHistory());
const sortKey = ref<SearchSortKey>(loadSearchSort());
const searchDockBottom = ref("var(--bottom-tabs-inset)");
const searchStageStyle = ref<Record<string, string>>({
  top: "var(--app-brand-row)",
  height:
    "calc(100dvh - var(--app-brand-row) - var(--bottom-tabs-inset) - 4.5rem)",
});
const searchDockEl = ref<HTMLElement | null>(null);
const historyListEl = ref<HTMLUListElement | null>(null);
const resultsEl = ref<HTMLElement | null>(null);

const sortOptions: { key: SearchSortKey; label: string }[] = [
  { key: "popularity", label: "Popular" },
  { key: "rating", label: "Rating" },
  { key: "year", label: "Released" },
];

const showHistory = computed(() => !searchQuery.value.trim());
const historyOldestFirst = computed(() => [...history.value].reverse());
const displayedResults = computed(() =>
  sortSearchResults(results.value, sortKey.value)
);
const searchDockStyle = computed(() => ({ bottom: searchDockBottom.value }));

function readChrome(): SearchChrome {
  const header = document.querySelector(".app-brand");
  const tabs = document.querySelector(".bottom-tabs");
  return {
    layoutHeight: window.innerHeight,
    headerHeight: header?.getBoundingClientRect().height ?? 44,
    tabsHeight: tabs?.getBoundingClientRect().height ?? 80,
    dockHeight: searchDockEl.value?.getBoundingClientRect().height ?? 70,
  };
}

function readViewport(): VisualViewportBox | null {
  const vv = window.visualViewport;
  if (!vv) return null;
  return { offsetTop: vv.offsetTop, height: vv.height };
}

function syncSearchLayout() {
  const chrome = readChrome();
  const viewport = readViewport();
  searchDockBottom.value = `${searchDockBottomPx(chrome, viewport)}px`;
  const stage = searchStageBox(chrome, viewport);
  searchStageStyle.value = {
    top: `${stage.top}px`,
    height: `${stage.height}px`,
  };
}

async function scrollToThumb(getEl: () => HTMLElement | null) {
  await nextTick();
  const el = getEl();
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

watch([showHistory, historyOldestFirst], () => {
  if (showHistory.value) void scrollToThumb(() => historyListEl.value);
  void nextTick().then(syncSearchLayout);
});

watch(displayedResults, () => {
  if (!showHistory.value) void scrollToThumb(() => resultsEl.value);
});

let searchTimeout: ReturnType<typeof setTimeout>;

function syncSearchRoute(query: string) {
  if (parseSearchQuery(route.query.q) === query) return;
  return router.replace({ name: "search", query: searchRouteQuery(query) });
}

watch(searchQuery, (query) => {
  syncSearchRoute(query);
});

watch(
  () => route.query.q,
  (value) => {
    const q = parseSearchQuery(value);
    if (q === searchQuery.value) return;
    searchQuery.value = q;
    clearTimeout(searchTimeout);
    void runSearch(q, false);
  }
);

async function runSearch(query: string, record: boolean) {
  const q = query.trim();
  if (!q) {
    results.value = [];
    return;
  }

  const cached = loadSearchResults(q);
  if (cached) {
    results.value = cached;
    if (record) history.value = pushSearchHistory(q);
    return;
  }

  loading.value = true;
  try {
    results.value = await catalogStore.search(q);
    saveSearchResults(q, results.value);
    if (record) {
      history.value = pushSearchHistory(q);
    }
  } finally {
    loading.value = false;
  }
}

const onSearch = () => {
  clearTimeout(searchTimeout);

  if (!searchQuery.value.trim()) {
    results.value = [];
    return;
  }

  searchTimeout = setTimeout(() => {
    void runSearch(searchQuery.value, false);
  }, 300);
};

const onSubmit = () => {
  clearTimeout(searchTimeout);
  void runSearch(searchQuery.value, true);
};

const setSort = (key: SearchSortKey) => {
  sortKey.value = saveSearchSort(key);
};

const runHistory = (item: string) => {
  clearTimeout(searchTimeout);
  searchQuery.value = item;
  history.value = pushSearchHistory(item);
  void runSearch(item, false);
};

const removeHistory = (item: string) => {
  history.value = removeSearchHistoryItem(item);
};

const clearHistory = () => {
  history.value = clearSearchHistory();
};

const toggleFavorite = async (titleId: string) => {
  await favoritesStore.toggle(titleId);
};

const toggleWatchlist = async (title: TitleSummary) => {
  await watchlistStore.toggle(title.id, title);
};

const goToTitle = async (titleId: string) => {
  await syncSearchRoute(searchQuery.value);
  await router.push({ name: "title", params: { id: titleId } });
};

const clearQuery = () => {
  clearTimeout(searchTimeout);
  searchQuery.value = "";
  results.value = [];
};

onMounted(() => {
  void nextTick().then(syncSearchLayout);
  window.visualViewport?.addEventListener("resize", syncSearchLayout);
  window.visualViewport?.addEventListener("scroll", syncSearchLayout);
  window.addEventListener("resize", syncSearchLayout);
  if (
    searchQuery.value.trim() &&
    loadSearchResults(searchQuery.value) == null
  ) {
    void runSearch(searchQuery.value, false);
  }
  if (!showHistory.value) void scrollToThumb(() => resultsEl.value);
  else void scrollToThumb(() => historyListEl.value);
});

onUnmounted(() => {
  window.visualViewport?.removeEventListener("resize", syncSearchLayout);
  window.visualViewport?.removeEventListener("scroll", syncSearchLayout);
  window.removeEventListener("resize", syncSearchLayout);
});
</script>

<style scoped>
.search {
  min-height: 100%;
}

.search-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--bottom-tabs-inset);
  z-index: 40;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.search-dock-inner {
  pointer-events: auto;
  width: 100%;
  max-width: var(--column-max);
  padding: 0 var(--column-pad) 0.6rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.45rem;
}

.search-bar {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  justify-content: center;
  background: transparent;
  border: 0;
}

.search-sort {
  display: flex;
  padding: 0.15rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.search-sort-btn {
  flex: 1;
  padding: 0.28rem 0.4rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.search-sort-btn.active {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-ico {
  position: absolute;
  left: 0.9rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 2.85rem;
  padding: 0.65rem 2.6rem 0.65rem 2.7rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.2;
  appearance: none;
  -webkit-appearance: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.search-input::-webkit-search-decoration,
.search-input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.75;
}

.search-input:hover {
  border-color: var(--colors-neutral-500);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  background: color-mix(in oklch, var(--bg-surface) 88%, var(--primary) 12%);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 28%, transparent);
}

.search-clear {
  position: absolute;
  right: 0.35rem;
  width: 2.1rem;
  height: 2.1rem;
  display: grid;
  place-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.search-clear:active {
  color: var(--text-primary);
  background: color-mix(in oklch, var(--text-primary) 10%, transparent);
}

.search-stage {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.search-stage-inner {
  width: 100%;
  max-width: var(--column-max);
  height: 100%;
  min-height: 0;
  padding: 0 var(--column-pad);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.loading,
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.results {
  pointer-events: auto;
  width: 100%;
  margin-top: auto;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem 0 0.35rem;
}

.history {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 0;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.history-head h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.clear-btn {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.25rem 0.15rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.history-empty {
  padding: 0.35rem 0.25rem 0.15rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: min(42dvh, 18rem);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 10px;
  background: var(--bg-surface);
}

.history-query {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.75rem;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.history-query span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-ico {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.history-remove {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin-right: 0.25rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.history-remove:active {
  color: var(--text-primary);
}
</style>
