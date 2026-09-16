<template>
  <TitleDeckPicker
    :items="deckItems"
    selection-key="for-you"
    strip-label="Suggested titles"
    :dock-bottom-offset="dockBottomOffset"
    show-social
    allow-pass
    always-center
    :pass-only="passOnly"
    :tour-pass-spotlight="tourPassSpotlight"
    :primary-action-label="passOnly ? '' : watchlistLabel"
    :primary-action-active="watchlisted"
    :secondary-action-label="passOnly ? '' : favoriteLabel"
    :secondary-action-active="favorited"
    @open="$emit('open', $event)"
    @open-overview="$emit('open-overview', $event)"
    @primary-action="(id, origin) => $emit('toggle-watchlist', id, origin)"
    @secondary-action="(id, origin) => $emit('toggle-favorite', id, origin)"
    @select="selectedTitleId = $event"
    @pass="(id, origin) => $emit('pass', id, origin)"
  />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { OverlapSuggestion } from "@cinima/shared";
import TitleDeckPicker, { type DeckItem } from "@/components/TitleDeckPicker.vue";
import { deckCenterIndex } from "@/lib/deckSelection";
import { watchlistButtonLabel } from "@/lib/titleActionLabels";

const props = defineProps<{
  suggestions: OverlapSuggestion[];
  isFavorite: (titleId: string) => boolean;
  isOnWatchlist: (titleId: string) => boolean;
  dockBottomOffset?: string;
  passOnly?: boolean;
  tourPassSpotlight?: boolean;
}>();

defineEmits<{
  open: [titleId: string];
  "open-overview": [titleId: string];
  "toggle-favorite": [titleId: string, origin: MouseEvent];
  "toggle-watchlist": [titleId: string, origin: MouseEvent];
  pass: [titleId: string, origin: PointerEvent];
}>();

const deckItems = computed((): DeckItem[] =>
  props.suggestions
    .filter((s) => Boolean(s.title.posterUrl?.trim()))
    .map((s) => ({
      title: s.title,
      sampleWallets: s.sampleWallets,
      recommendCount: s.recommendCount,
      favoriteCount: s.favoriteCount,
    }))
);

const selectedTitleId = ref<string>(
  deckItems.value[deckCenterIndex(deckItems.value.length)]?.title.id ?? ""
);

const favorited = computed(() =>
  selectedTitleId.value ? props.isFavorite(selectedTitleId.value) : false
);
const watchlisted = computed(() =>
  selectedTitleId.value ? props.isOnWatchlist(selectedTitleId.value) : false
);
const favoriteLabel = computed(() =>
  favorited.value ? "Favorited" : "Add to Favorites"
);
const watchlistLabel = computed(() => watchlistButtonLabel(watchlisted.value));
</script>
