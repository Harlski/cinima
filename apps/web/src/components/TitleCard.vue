<template>
  <div
    class="title-card"
    :class="
      variant === 'horizontal' ? 'title-card--horizontal' : 'title-card--poster'
    "
  >
    <div class="card-poster poster-press" @click="$emit('click')">
      <img
        v-if="title.posterUrl"
        :src="title.posterUrl"
        :alt="title.title"
      />
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
          <template v-if="title.imdbRating != null">
            <span class="dot">·</span>
            <span class="rating">{{ title.imdbRating.toFixed(1) }}</span>
          </template>
        </div>
      </div>

      <button
        type="button"
        class="favorite-button"
        :class="{ favorited }"
        :aria-label="favorited ? 'Remove favorite' : 'Add favorite'"
        @click.stop="$emit('toggle-favorite', title.id)"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04096 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.2225 22.4518 8.5C22.4518 7.7775 22.3095 7.06211 22.0329 6.39464C21.7564 5.72717 21.351 5.12084 20.84 4.61Z"
            :fill="favorited ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TitleSummary } from "@nimcharts/shared";

const props = withDefaults(
  defineProps<{
    title: TitleSummary;
    favorited: boolean;
    variant?: "poster" | "horizontal";
  }>(),
  {
    variant: "poster",
  }
);

defineEmits<{
  click: [];
  "toggle-favorite": [titleId: string];
}>();

const mediaLabel = computed(() => {
  const kind = props.title.mediaType || props.title.kind;
  return kind === "tv" ? "TV" : "Movie";
});
</script>

<style scoped>
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

.favorite-button svg {
  width: 20px;
  height: 20px;
}

.favorite-button.favorited {
  color: var(--primary);
}
</style>
