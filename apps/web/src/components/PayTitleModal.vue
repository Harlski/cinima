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
      <PosterImg
        v-if="title.posterUrl"
        class="gate-poster"
        :src="title.posterUrl"
        :alt="title.title"
        :spinner-size="36"
      />
      <h2 :id="titleId">{{ title.title }}</h2>
      <p>{{ ratingsCopy }}</p>
      <a :href="payUrl" class="nq-pill-blue nq-pill-lg nq-pill-stretch">
        Explore CINIMA on NIMIQ PAY
      </a>
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
import PosterImg from "@/components/PosterImg.vue";

const props = defineProps<{
  title: TitleSummary;
  payUrl: string;
}>();

defineEmits<{
  close: [];
}>();

const titleId = "pay-title-gate-title";
const imdbUrl = computed(() => imdbTitleUrl(props.title.imdbId));

const ratingsCopy = computed(() => {
  const kind = props.title.mediaType === "tv" ? "episode ratings" : "ratings";
  return `View ${kind} and title info on Cinima inside the Nimiq Pay app.`;
});
</script>

<style scoped>
.gate-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.gate-dialog {
  position: relative;
  width: min(100%, 24rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding: 2.25rem 1.75rem 1.75rem;
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

.gate-poster {
  width: 6.5rem;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: 8px;
}

.gate-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
}

.gate-dialog p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.45;
}

.gate-dialog a.nq-pill-blue {
  margin-top: 0.25rem;
  text-decoration: none;
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
