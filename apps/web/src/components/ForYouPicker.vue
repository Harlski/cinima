<template>
  <TitleDeckPicker
    :items="deckItems"
    selection-key="for-you"
    strip-label="Suggested titles"
    :dock-bottom-offset="dockBottomOffset"
    show-social
    show-refresh
    :primary-action-label="watchlistLabel"
    :primary-action-active="watchlisted"
    :secondary-action-label="favoriteLabel"
    :secondary-action-active="favorited"
    @open="$emit('open', $event)"
    @primary-action="$emit('toggle-watchlist', $event)"
    @secondary-action="$emit('toggle-favorite', $event)"
    @select="selectedTitleId = $event"
    @refresh="refresh"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { OverlapSuggestion } from "@cinima/shared";
import TitleDeckPicker, { type DeckItem } from "@/components/TitleDeckPicker.vue";
import { loadDeckSelection, restoreDeckWindow } from "@/lib/deckSelection";
import { centerIndex, initialSuggestionWindow, nextSuggestionWindow } from "@/lib/suggestionDeck";

const props = defineProps<{
  suggestions: OverlapSuggestion[];
  isFavorite: (titleId: string) => boolean;
  isOnWatchlist: (titleId: string) => boolean;
  dockBottomOffset?: string;
}>();

defineEmits<{
  open: [titleId: string];
  "toggle-favorite": [titleId: string];
  "toggle-watchlist": [titleId: string];
}>();

function toDeckItems(suggestions: OverlapSuggestion[]): DeckItem[] {
  return suggestions.map((s) => ({
    title: s.title,
    sampleWallets: s.sampleWallets,
  }));
}

function toWindowSuggestions(pool: OverlapSuggestion[], window: DeckItem[]): OverlapSuggestion[] {
  return window.map((item) => {
    const source = pool.find((s) => s.title.id === item.title.id)!;
    return { ...source, title: item.title };
  });
}

function buildWindow(pool: OverlapSuggestion[]): { items: DeckItem[]; selectedIndex: number } {
  const deckPool = toDeckItems(pool);
  const remembered = loadDeckSelection("for-you");
  if (remembered) {
    const restored = restoreDeckWindow(deckPool, remembered);
    if (restored.items.length > 0) return restored;
  }
  const window = initialSuggestionWindow(deckPool);
  return { items: window, selectedIndex: centerIndex(window.length) };
}

const initial = buildWindow(props.suggestions);
const windowSuggestions = ref<OverlapSuggestion[]>(
  toWindowSuggestions(props.suggestions, initial.items)
);
const selectedTitleId = ref<string>(
  windowSuggestions.value[initial.selectedIndex]?.title.id ??
    windowSuggestions.value[centerIndex(windowSuggestions.value.length)]?.title.id ??
    ""
);

const deckItems = computed((): DeckItem[] =>
  windowSuggestions.value.map((s) => ({
    title: s.title,
    sampleWallets: s.sampleWallets,
  }))
);

const favorited = computed(() =>
  selectedTitleId.value ? props.isFavorite(selectedTitleId.value) : false
);
const watchlisted = computed(() =>
  selectedTitleId.value ? props.isOnWatchlist(selectedTitleId.value) : false
);
const favoriteLabel = computed(() => (favorited.value ? "Favorited" : "Add to Favorites"));
const watchlistLabel = computed(() =>
  watchlisted.value ? "In My List" : "Add to My List"
);

function resetFromPool() {
  const next = buildWindow(props.suggestions);
  windowSuggestions.value = toWindowSuggestions(props.suggestions, next.items);
  selectedTitleId.value =
    windowSuggestions.value[next.selectedIndex]?.title.id ??
    windowSuggestions.value[centerIndex(windowSuggestions.value.length)]?.title.id ??
    "";
}

function refresh() {
  const currentIds = windowSuggestions.value.map((item) => item.title.id);
  const next = nextSuggestionWindow(props.suggestions, currentIds);
  windowSuggestions.value = next;
  selectedTitleId.value = next[centerIndex(next.length)]?.title.id ?? "";
}

watch(
  () => props.suggestions.map((item) => item.title.id).join("|"),
  () => {
    resetFromPool();
  }
);
</script>
