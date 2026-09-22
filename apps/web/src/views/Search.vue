<template>
  <div class="search">
    <div class="search-stage" :style="searchStageStyle">
      <div class="search-stage-inner">
        <div v-if="wait === 'searching'" class="loading">
          <LoadingWait label="Searching" />
        </div>

        <div v-else-if="wait === 'retry'" class="empty">
          <p>Search didn't finish</p>
          <button type="button" class="nq-pill-blue" @click="retrySearch">
            Retry
          </button>
        </div>

        <div
          v-else-if="wait === 'empty'"
          class="empty"
        >
          <p>No results found</p>
          <div v-if="titleLookups.length" class="sparse-lookups-stage">
            <h2>Last looked up</h2>
            <TitleLookupList
              :items="titleLookups"
              @open="openLookup"
              @remove="removeLookup"
            />
          </div>
        </div>

        <div v-else-if="wait === 'results' && showSparseLookups" class="results sparse-with-results">
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
          <div class="sparse-lookups-stage">
            <h2>Last looked up</h2>
            <TitleLookupList
              :items="titleLookups"
              @open="openLookup"
              @remove="removeLookup"
            />
          </div>
        </div>

        <div v-else-if="wait === 'results'" ref="resultsEl" class="results">
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
          <div v-if="titleLookups.length" class="lookups">
            <div class="history-head">
              <h2>Last looked up</h2>
            </div>
            <TitleLookupList
              :items="titleLookups"
              @open="openLookup"
              @remove="removeLookup"
            />
          </div>

          <template v-if="history.length">
          <div class="history-head">
            <h2>Recent searches</h2>
            <button
              type="button"
              class="clear-btn"
              @click="clearHistory"
            >
              Clear
            </button>
          </div>

          <ul ref="historyListEl" class="history-list">
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
          </template>
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
          <div class="search-field-wrap">
            <TourSpotlight :id="TOUR_SPOTLIGHT.searchField" radius="999px">
              <div
                class="search-box"
                :data-tour="TOUR_SPOTLIGHT.searchField"
              >
                <NqIcon name="magnifying-glass" :size="20" class="search-ico" />
                <input
                  ref="searchInputEl"
                  v-model="searchQuery"
                  @input="onFieldEvent"
                  @search.prevent="onFieldEvent"
                  @change="onFieldEvent"
                  type="search"
                  enterkeyhint="search"
                  autocomplete="off"
                  placeholder="Search movies & TV shows..."
                  class="search-input"
                  :aria-describedby="searchHintId"
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
                <span
                  :id="searchHintId"
                  class="search-hint"
                  :class="{ 'search-hint--pinned': hintPinned }"
                  role="tooltip"
                >
                  {{ SEARCH_BAR_HINT }}
                </span>
              </div>
            </TourSpotlight>
          </div>
        </form>
      </div>
    </div>

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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFavoritesStore } from "@/stores/favorites";
import { useWatchlistStore } from "@/stores/watchlist";
import { useCatalogStore } from "@/stores/catalog";
import TitleCard from "@/components/TitleCard.vue";
import TitleActionDialogs from "@/components/TitleActionDialogs.vue";
import TitleLookupList from "@/components/TitleLookupList.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import NqIcon from "@/components/NqIcon.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import { SEARCH_BAR_HINT, TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { searchHintPinned } from "@/lib/searchChrome";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
  removeSearchHistoryItem,
} from "@/lib/searchHistory";
import {
  loadTitleLookups,
  pushTitleLookup,
  removeTitleLookup,
  type TitleLookup,
} from "@/lib/searchTitleLookups";
import { parseSearchQuery, searchRouteQuery } from "@/lib/searchQuery";
import { searchFieldAction } from "@/lib/searchField";
import {
  loadSearchResults,
  saveSearchResults,
} from "@/lib/searchResultsCache";
import {
  SEARCH_WAIT_DEADLINE_MS,
  searchWait,
} from "@/lib/searchWait";
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
import { useTitleActionConfirm } from "@/composables/useTitleActionConfirm";
import { useTitleFlightStore } from "@/stores/titleFlight";

const route = useRoute();
const router = useRouter();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const searchHintId = "search-bar-hint";
const catalogStore = useCatalogStore();
const titleFlight = useTitleFlightStore();
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

const searchQuery = ref(parseSearchQuery(route.query.q));
const results = ref<TitleSummary[]>(
  loadSearchResults(searchQuery.value) ?? []
);
const loading = ref(false);
const failed = ref(false);
const history = ref<string[]>(loadSearchHistory());
const titleLookups = ref<TitleLookup[]>(loadTitleLookups());
const sortKey = ref<SearchSortKey>(loadSearchSort());
const searchDockBottom = ref("var(--bottom-tabs-inset)");
const searchStageStyle = ref<Record<string, string>>({
  top: "var(--app-brand-row)",
  height:
    "calc(100dvh - var(--app-brand-row) - var(--bottom-tabs-inset) - 4.5rem)",
});
const searchDockEl = ref<HTMLElement | null>(null);
const searchInputEl = ref<HTMLInputElement | null>(null);
const historyListEl = ref<HTMLUListElement | null>(null);
const resultsEl = ref<HTMLElement | null>(null);

const sortOptions: { key: SearchSortKey; label: string }[] = [
  { key: "popularity", label: "Popular" },
  { key: "rating", label: "Rating" },
  { key: "year", label: "Released" },
];

const wait = computed(() =>
  searchWait({
    query: searchQuery.value,
    loading: loading.value,
    failed: failed.value,
    resultCount: results.value.length,
  })
);
const showHistory = computed(() => wait.value === "history");
const hintPinned = computed(() =>
  searchHintPinned({
    showingHistory: showHistory.value,
    recentSearchCount: history.value.length,
    lookupCount: titleLookups.value.length,
  })
);
const showSparseLookups = computed(
  () =>
    !!searchQuery.value.trim() &&
    !loading.value &&
    results.value.length > 0 &&
    results.value.length < 3 &&
    titleLookups.value.length > 0
);
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
let searchAttempt = 0;
let inflight: AbortController | null = null;
let deadlineTimer: ReturnType<typeof setTimeout> | null = null;

function abortInflight() {
  if (deadlineTimer) {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
  }
  inflight?.abort();
  inflight = null;
}

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
    abortInflight();
    results.value = [];
    failed.value = false;
    loading.value = false;
    return;
  }

  const my = ++searchAttempt;
  abortInflight();
  const ac = new AbortController();
  inflight = ac;
  deadlineTimer = setTimeout(() => ac.abort(), SEARCH_WAIT_DEADLINE_MS);

  const cached = loadSearchResults(q);
  failed.value = false;
  if (cached) {
    results.value = cached;
    if (record) history.value = pushSearchHistory(q);
  } else {
    results.value = [];
    loading.value = true;
  }

  try {
    const { results: fresh, stalled } = await catalogStore.search(q, ac.signal);
    if (my !== searchAttempt) return;
    if (stalled) {
      failed.value = true;
      results.value = [];
      return;
    }
    results.value = fresh;
    saveSearchResults(q, fresh);
    failed.value = false;
    if (record && !cached) {
      history.value = pushSearchHistory(q);
    }
  } catch {
    if (my !== searchAttempt) return;
    failed.value = !cached;
  } finally {
    if (deadlineTimer) {
      clearTimeout(deadlineTimer);
      deadlineTimer = null;
    }
    if (my === searchAttempt) loading.value = false;
  }
}

function retrySearch() {
  void runSearch(searchQuery.value, false);
}

const onFieldEvent = (event: Event) => {
  applyFieldAction(event.type, event);
};

const onSubmit = () => {
  applyFieldAction("submit");
};

function nativeSearchValue(event?: Event): string {
  if (event?.target instanceof HTMLInputElement) return event.target.value;
  if (searchInputEl.value) return searchInputEl.value.value;
  return searchQuery.value;
}

function applyFieldAction(eventType: string, event?: Event) {
  const native = nativeSearchValue(event);
  searchQuery.value = native;
  const action = searchFieldAction(eventType, native);
  clearTimeout(searchTimeout);
  if (action.kind === "idle") {
    abortInflight();
    results.value = [];
    failed.value = false;
    loading.value = false;
    return;
  }
  if (action.kind === "live") {
    searchAttempt += 1;
    abortInflight();
    failed.value = false;
    if (!loadSearchResults(action.query)) {
      results.value = [];
      loading.value = true;
    }
    searchTimeout = setTimeout(() => {
      void runSearch(action.query, false);
    }, 300);
    return;
  }
  void runSearch(action.query, true);
}

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

function findTitle(titleId: string): TitleSummary | Pick<TitleSummary, "title"> | undefined {
  return (
    results.value.find((item) => item.id === titleId) ??
    displayedResults.value.find((item) => item.id === titleId) ??
    titleLookups.value.find((item) => item.id === titleId)
  );
}

const toggleFavorite = async (titleId: string, origin?: MouseEvent) => {
  const found = findTitle(titleId);
  await requestToggleFavorite(titleId, {
    title: found,
    isFavorited: favoritesStore.isFavorite(titleId),
    onAdded: () => {
      if (found) {
        titleFlight.play({
          kind: "favorite",
          title: found,
          origin: origin ?? null,
        });
      }
    },
  });
};

const toggleWatchlist = async (title: TitleSummary, origin?: MouseEvent) => {
  if (!watchlistStore.isOnWatchlist(title.id)) {
    await catalogStore.recordSearchOpen(title.id);
  }
  await requestToggleWatchlist(title.id, {
    title,
    isWatchlisted: watchlistStore.isOnWatchlist(title.id),
    onAdded: () => {
      titleFlight.play({
        kind: "watchlist",
        title,
        origin: origin ?? null,
      });
    },
  });
};

const onConfirmAction = async () => {
  await confirmPending();
};

const goToTitle = async (titleId: string) => {
  const title =
    results.value.find((item) => item.id === titleId) ??
    titleLookups.value.find((item) => item.id === titleId);
  if (title) {
    titleLookups.value = pushTitleLookup(title);
  }
  await catalogStore.recordSearchOpen(titleId);
  await syncSearchRoute(searchQuery.value);
  await router.push({ name: "title", params: { id: titleId } });
};

const removeLookup = (item: TitleLookup) => {
  titleLookups.value = removeTitleLookup(item.id);
};

const openLookup = async (item: TitleLookup) => {
  titleLookups.value = pushTitleLookup(item);
  await catalogStore.recordSearchOpen(item.id);
  await router.push({ name: "title", params: { id: item.id } });
};

const clearQuery = () => {
  clearTimeout(searchTimeout);
  abortInflight();
  searchQuery.value = "";
  results.value = [];
  failed.value = false;
  loading.value = false;
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
  clearTimeout(searchTimeout);
  abortInflight();
  window.visualViewport?.removeEventListener("resize", syncSearchLayout);
  window.visualViewport?.removeEventListener("scroll", syncSearchLayout);
  window.removeEventListener("resize", syncSearchLayout);
});
</script>

<style scoped>
.search {
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
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
  touch-action: none;
  overscroll-behavior: none;
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

.search-field-wrap {
  width: 100%;
}

/* Shell keeps content-box so bleed padding sits outside the bar; border-box
 * would shrink the field by the tour glow bleed and break full-width Search. */
.search-field-wrap :deep(.gold-glow-shell) {
  display: block;
  width: 100%;
  box-sizing: content-box;
}

.search-field-wrap :deep(.gold-glow-content) {
  width: 100%;
  box-sizing: border-box;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-hint {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  z-index: 2;
  width: min(22rem, calc(100vw - 2.5rem));
  padding: 0.45rem 0.7rem;
  border-radius: 0.55rem;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 8px 18px color-mix(in oklch, var(--colors-neutral) 18%, transparent);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease;
}

.search-hint::before {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--border);
}

.search-hint::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-1px);
  border: 6px solid transparent;
  border-top-color: var(--bg-surface);
}

.search-hint--pinned,
.search-box:hover .search-hint,
.search-box:focus-within .search-hint {
  opacity: 1;
  visibility: visible;
}

/* CINIMA wordmark gold (--gold / --colors-gold, #e5c158). */
.search-hint--pinned {
  color: var(--gold, #e5c158);
  border-color: var(--gold, #e5c158);
  animation: search-hint-bob 2.8s ease-in-out infinite;
}

.search-hint--pinned::before {
  border-top-color: var(--gold, #e5c158);
}

@keyframes search-hint-bob {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-0.35rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-hint--pinned {
    animation: none;
  }
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
  pointer-events: auto;
}

.empty p {
  margin: 0;
}

.sparse-lookups-stage {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.sparse-lookups-stage h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: left;
}

.lookups {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}

.results {
  pointer-events: auto;
  width: 100%;
  margin-top: auto;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: none;
  touch-action: pan-y;
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
  touch-action: none;
  overscroll-behavior: none;
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

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: min(42dvh, 18rem);
  overflow-y: auto;
  overscroll-behavior: none;
  touch-action: pan-y;
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
