<template>
  <div
    class="title-card"
    :class="
      variant === 'horizontal' ? 'title-card--horizontal' : 'title-card--poster'
    "
  >
    <div class="card-poster poster-press" @click="$emit('click')">
      <PosterImg v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
      <div v-else class="poster-placeholder">
        {{ variant === "horizontal" ? title.title.charAt(0) : title.title }}
      </div>
    </div>

    <div class="card-main">
      <div class="card-text" @click="$emit('click')">
        <div class="card-title">{{ title.title }}</div>
        <div v-if="variant === 'horizontal'" class="card-meta">
          <span v-if="title.year">{{ title.year }}</span>
          <span v-if="title.year" class="dot">·</span>
          <span>{{ mediaLabel }}</span>
          <span class="dot">·</span>
          <span class="rating" :class="{ muted: title.rating == null }">
            {{ formatTitleRating(title.rating) }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="watchlist-button"
        :class="{ watchlisted }"
        :aria-label="watchlisted ? watchlistRemoveAriaLabel() : watchlistAddAriaLabel()"
        @click.stop="$emit('toggle-watchlist', title)"
      >
        <NqIcon name="plus-circle" :size="20" />
      </button>

      <button
        type="button"
        class="favorite-button"
        :class="{ favorited }"
        :aria-label="favorited ? 'Remove favorite' : 'Add favorite'"
        @click.stop="$emit('toggle-favorite', title.id)"
      >
        <NqIcon name="heart" :size="20" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TitleSummary } from "@cinima/shared";
import NqIcon from "@/components/NqIcon.vue";
import PosterImg from "@/components/PosterImg.vue";
import { formatTitleRating } from "@/lib/titleRating";
import { watchlistAddAriaLabel, watchlistRemoveAriaLabel } from "@/lib/titleActionLabels";

const props = withDefaults(
  defineProps<{
    title: TitleSummary;
    favorited: boolean;
    watchlisted?: boolean;
    variant?: "poster" | "horizontal";
  }>(),
  {
    variant: "poster",
    watchlisted: false,
  }
);

defineEmits<{
  click: [];
  "toggle-favorite": [titleId: string];
  "toggle-watchlist": [title: TitleSummary];
}>();

const mediaLabel = computed(() => {
  const kind = props.title.mediaType || props.title.kind;
  return kind === "tv" ? "TV" : "Movie";
});
</script>

<style scoped>
.title-card {
  flex-shrink: 0;
}

.title-card--poster {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-radius: 12px;
  overflow: hidden;
}

.title-card--poster > .card-poster {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  height: auto;
  background: var(--bg-primary);
  cursor: pointer;
  overflow: hidden;
}

.title-card--poster > .card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.title-card--poster > .card-poster .poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.title-card--poster > .card-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  min-width: 0;
}

.title-card--poster .card-text {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.title-card--poster .card-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Compact horizontal cards (Search) */
.title-card--horizontal {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem;
  background: var(--bg-surface);
  border-radius: 12px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.title-card--horizontal:active {
  filter: brightness(1.08);
}

.title-card--horizontal > .card-poster {
  position: relative;
  flex: 0 0 auto;
  width: 52px;
  height: 78px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-primary);
  cursor: pointer;
}

.title-card--horizontal > .card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.title-card--horizontal > .card-poster .poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.title-card--horizontal > .card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.title-card--horizontal .card-text {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.title-card--horizontal .card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-card--horizontal .card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.title-card--horizontal .dot {
  opacity: 0.55;
}

.title-card--horizontal .rating {
  color: var(--warning);
  font-weight: 600;
}

.title-card--horizontal .rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.favorite-button {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.watchlist-button {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.favorite-button :deep(.nq-icon),
.watchlist-button :deep(.nq-icon) {
  width: 20px;
  height: 20px;
}

.favorite-button.favorited {
  color: var(--primary);
}

.watchlist-button.watchlisted {
  color: var(--gold);
}
</style>
