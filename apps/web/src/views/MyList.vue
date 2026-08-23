<template>
  <div
    class="my-list"
    :class="{
      'my-list--has-tabs': hasAnyItems,
      'my-list--deck': showDeck,
    }"
  >
    <div v-if="loading && !hasAnyItems" class="loading">
      <NqSpinner />
    </div>

    <div v-else-if="!hasAnyItems" class="empty">
      <h2>My List</h2>
      <p>
        Save movies and shows you want to watch. Tap
        <strong>Add to My List</strong> on Search or Discover.
      </p>
      <RouterLink to="/search" class="nq-pill-blue nq-pill-stretch empty-cta">
        Search titles
      </RouterLink>
    </div>

    <template v-else>
      <div v-if="filteredItems.length === 0" class="tab-empty">
        <p>
          No {{ activeTab === "movie" ? "movies" : "TV shows" }} in your list yet.
        </p>
      </div>

      <TitleDeckPicker
        v-else
        :key="activeTab"
        :items="deckItems"
        :selection-key="`my-list-${activeTab}`"
        strip-label="My List"
        dock-bottom-offset="var(--my-list-tabs-height, 2.85rem)"
        :primary-action-label="watchlistLabel"
        :primary-action-active="watchlisted"
        :secondary-action-label="favoriteLabel"
        :secondary-action-active="favorited"
        @open="goToTitle"
        @primary-action="toggleWatchlist"
        @secondary-action="toggleFavorite"
        @select="selectedTitleId = $event"
      />
    </template>

    <nav v-if="hasAnyItems" class="my-list-tabs" aria-label="My List media type">
      <div class="my-list-tabs-inner">
        <div class="my-list-tab-row" role="tablist">
          <button
            type="button"
            role="tab"
            class="my-list-tab"
            :class="{ active: activeTab === 'movie' }"
            :aria-selected="activeTab === 'movie'"
            @click="activeTab = 'movie'"
          >
            Movies
          </button>
          <button
            type="button"
            role="tab"
            class="my-list-tab"
            :class="{ active: activeTab === 'tv' }"
            :aria-selected="activeTab === 'tv'"
            @click="activeTab = 'tv'"
          >
            TV Shows
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import type { MediaType } from "@cinima/shared";
import { useFavoritesStore } from "@/stores/favorites";
import { useWatchlistStore } from "@/stores/watchlist";
import TitleDeckPicker, { type DeckItem } from "@/components/TitleDeckPicker.vue";
import NqSpinner from "@/components/NqSpinner.vue";

defineOptions({ name: "MyList" });

const router = useRouter();
const favoritesStore = useFavoritesStore();
const watchlistStore = useWatchlistStore();
const { titles } = storeToRefs(watchlistStore);

const loading = ref(false);
const selectedTitleId = ref("");
const activeTab = ref<MediaType>("movie");

const hasAnyItems = computed(() => titles.value.length > 0);
const showDeck = computed(() => filteredItems.value.length > 0);

const filteredItems = computed(() =>
  titles.value.filter((title) => (title.mediaType || title.kind) === activeTab.value)
);

const deckItems = computed((): DeckItem[] =>
  filteredItems.value.map((title) => ({ title }))
);

const favorited = computed(() =>
  selectedTitleId.value ? favoritesStore.isFavorite(selectedTitleId.value) : false
);
const watchlisted = computed(() =>
  selectedTitleId.value ? watchlistStore.isOnWatchlist(selectedTitleId.value) : true
);
const favoriteLabel = computed(() => (favorited.value ? "Favorited" : "Add to Favorites"));
const watchlistLabel = computed(() =>
  watchlisted.value ? "In My List" : "Add to My List"
);

function mediaKind(title: { mediaType?: MediaType; kind?: MediaType }) {
  return title.mediaType || title.kind;
}

function syncSelection() {
  if (!filteredItems.value.some((title) => title.id === selectedTitleId.value)) {
    selectedTitleId.value = filteredItems.value[0]?.id ?? "";
  }
}

function pickDefaultTab() {
  if (filteredItems.value.length > 0) return;
  const hasMovies = titles.value.some((title) => mediaKind(title) === "movie");
  const hasTv = titles.value.some((title) => mediaKind(title) === "tv");
  if (activeTab.value === "movie" && !hasMovies && hasTv) activeTab.value = "tv";
  if (activeTab.value === "tv" && !hasTv && hasMovies) activeTab.value = "movie";
}

async function ensureLoaded() {
  if (titles.value.length > 0) {
    syncSelection();
    return;
  }
  loading.value = true;
  try {
    await watchlistStore.refresh();
    pickDefaultTab();
    syncSelection();
  } finally {
    loading.value = false;
  }
}

const toggleWatchlist = async (titleId: string) => {
  const item = titles.value.find((t) => t.id === titleId);
  await watchlistStore.toggle(titleId, item);
  if (!watchlistStore.isOnWatchlist(titleId)) {
    pickDefaultTab();
    syncSelection();
  }
};

const toggleFavorite = async (titleId: string) => {
  await favoritesStore.toggle(titleId);
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

watch(titles, () => {
  pickDefaultTab();
  syncSelection();
});

watch(activeTab, () => {
  syncSelection();
});

onMounted(() => {
  void ensureLoaded();
});

onActivated(() => {
  pickDefaultTab();
  syncSelection();
});
</script>

<style scoped>
.my-list {
  padding-bottom: 2rem;
}

.my-list--has-tabs {
  --my-list-tabs-height: 2.85rem;
  padding-bottom: calc(var(--my-list-tabs-height) + 0.75rem);
}

.my-list--deck {
  padding-bottom: 0;
}

.loading {
  text-align: center;
  padding: 3rem 0;
}

.empty,
.tab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem 1rem;
  text-align: center;
}

.empty h2 {
  margin: 0;
  font-size: 1.35rem;
  color: var(--text-primary);
}

.empty p,
.tab-empty p {
  margin: 0;
  max-width: 22rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.empty-cta {
  margin-top: 0.5rem;
  max-width: 14rem;
  text-decoration: none;
  display: inline-flex;
  justify-content: center;
}

.my-list-tabs {
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

.my-list-tabs-inner {
  width: 100%;
  max-width: var(--column-max);
  padding-inline: var(--column-pad);
  box-sizing: border-box;
}

.my-list-tab-row {
  display: flex;
  gap: 0;
}

.my-list-tab {
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

.my-list-tab.active {
  color: var(--gold);
}

.my-list-tab.active::after {
  content: "";
  position: absolute;
  left: 20%;
  right: 20%;
  top: 0;
  height: 2px;
  border-radius: 0 0 2px 2px;
  background: var(--gold);
}

.my-list-tab:active {
  opacity: 0.85;
}
</style>
