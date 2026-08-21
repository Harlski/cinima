<template>
  <div class="search">
    <header class="page-header">
      <form class="search-box" @submit.prevent="onSubmit">
        <input
          v-model="searchQuery"
          @input="onSearch"
          type="search"
          enterkeyhint="search"
          placeholder="Search movies & TV shows..."
          class="search-input nq-input-box"
          autofocus
        />
      </form>
    </header>

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

      <ul v-else class="history-list">
        <li v-for="item in history" :key="item" class="history-item">
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

    <div v-else-if="loading" class="loading">Searching...</div>

    <div v-else-if="searchQuery && results.length === 0" class="empty">
      No results found
    </div>

    <div v-else class="results">
      <TitleCard
        v-for="title in results"
        :key="title.id"
        variant="horizontal"
        :title="title"
        :favorited="favoritesStore.isFavorite(title.id)"
        @toggle-favorite="toggleFavorite"
        @click="goToTitle(title.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useFavoritesStore } from "@/stores/favorites";
import { useCatalogStore } from "@/stores/catalog";
import TitleCard from "@/components/TitleCard.vue";
import NqIcon from "@/components/NqIcon.vue";
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
  removeSearchHistoryItem,
} from "@/lib/searchHistory";
import type { TitleSummary } from "@nimcharts/shared";

const router = useRouter();
const favoritesStore = useFavoritesStore();
const catalogStore = useCatalogStore();

const searchQuery = ref("");
const results = ref<TitleSummary[]>([]);
const loading = ref(false);
const history = ref<string[]>(loadSearchHistory());

const showHistory = computed(() => !searchQuery.value.trim());

let searchTimeout: ReturnType<typeof setTimeout>;

async function runSearch(query: string, record: boolean) {
  const q = query.trim();
  if (!q) {
    results.value = [];
    return;
  }

  loading.value = true;
  try {
    results.value = await catalogStore.search(q);
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

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};
</script>

<style scoped>
.search {
  min-height: 100%;
  padding-bottom: 2rem;
}

.page-header {
  padding: 1rem;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
}

.search-input:focus {
  outline: none;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem;
}

.history {
  padding: 1rem 1rem 0;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
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
  padding: 1.5rem 0.25rem;
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
