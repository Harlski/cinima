<template>
  <div class="gate-modal" role="presentation" @click.self="$emit('close')">
    <div
      class="gate-dialog nq-card"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <button type="button" class="gate-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <div class="gate-hero">
        <PosterImg
          v-if="title.posterUrl"
          :src="title.posterUrl"
          :alt="title.title"
          :spinner-size="36"
        />
        <div v-else class="gate-hero-fallback">{{ title.title }}</div>
      </div>

      <div class="gate-meta">
        <h2 :id="titleId">{{ title.title }}</h2>
        <p class="gate-meta-line">
          <span v-if="title.year">{{ title.year }}</span>
          <span v-if="title.year" class="gate-dot">·</span>
          <span>{{ mediaLabel }}</span>
          <span class="gate-dot">·</span>
          <span class="gate-rating" :class="{ muted: title.rating == null }">
            {{ formatTitleRating(title.rating) }}
          </span>
        </p>
        <p v-if="title.overview" class="gate-overview">
          {{ title.overview }}
        </p>
      </div>

      <PayOnlyActions
        :already-installed-url="payUrl"
        social-variant="payGate"
        :show-inquiries-label="false"
      />

      <template v-if="imdbUrl">
        <p class="gate-or">- or -</p>
        <a
          class="imdb-link"
          :href="imdbUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on IMDb
        </a>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { imdbTitleUrl, type TitleSummary } from "@cinima/shared";
import NqIcon from "@/components/NqIcon.vue";
import PayOnlyActions from "@/components/PayOnlyActions.vue";
import PosterImg from "@/components/PosterImg.vue";
import { formatTitleRating } from "@/lib/titleRating";

const props = defineProps<{
  title: TitleSummary;
  payUrl: string;
}>();

defineEmits<{
  close: [];
}>();

const titleId = "pay-title-gate-title";
const imdbUrl = computed(() => imdbTitleUrl(props.title.imdbId));
const mediaLabel = computed(() => (props.title.mediaType === "tv" ? "TV" : "Movie"));
</script>

<style scoped>
.gate-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.gate-dialog {
  position: relative;
  width: min(100%, 24rem);
  max-height: min(92dvh, 44rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2.25rem 1.5rem 1.5rem;
  text-align: center;
  background-color: color-mix(in oklch, var(--colors-neutral-50) 72%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.gate-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  padding: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.gate-hero {
  display: block;
  width: min(36vw, 8.75rem);
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  flex-shrink: 0;
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.gate-hero :deep(.poster-img),
.gate-hero :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}

.gate-hero-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-weight: 700;
}

.gate-meta {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  text-align: center;
  min-width: 0;
}

.gate-meta h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.gate-meta-line {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.gate-dot {
  opacity: 0.55;
  padding: 0 0.15rem;
}

.gate-rating {
  color: var(--warning);
  font-weight: 600;
}

.gate-rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.gate-overview {
  margin: 0;
  max-width: 100%;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.gate-or {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}

.imdb-link {
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
