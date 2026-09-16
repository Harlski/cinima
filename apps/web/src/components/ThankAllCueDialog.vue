<template>
  <div class="confirm-modal" data-scroll-trap role="presentation" @click.self="onCancel">
    <div
      class="confirm-dialog nq-card"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy"
    >
      <div v-if="title" class="leave-card">
        <div class="leave-poster">
          <PosterImg
            v-if="title.posterUrl"
            :src="title.posterUrl"
            :alt="title.title"
            :spinner-size="28"
          />
          <div v-else class="leave-poster-fallback">{{ title.title }}</div>
        </div>
        <p :id="nameId" class="leave-name">{{ title.title }}</p>
        <p class="leave-meta">
          <span v-if="title.year">{{ title.year }}</span>
          <span v-if="title.year" class="dot">·</span>
          <span>{{ mediaLabel }}</span>
          <span class="dot">·</span>
          <span class="rating" :class="{ muted: title.rating == null }">
            {{ formatTitleRating(title.rating) }}
          </span>
        </p>
      </div>

      <h2 :id="headingId">{{ cueMessage }}</h2>

      <div class="confirm-actions">
        <button
          type="button"
          class="nq-pill-secondary nq-pill-lg"
          :disabled="busy"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="nq-pill-blue nq-pill-lg"
          :disabled="busy"
          :aria-busy="busy"
          @click="$emit('confirm')"
        >
          {{ acceptedWaitLabel(confirmLabel, busy) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import {
  THANK_ALL_CUE_CANCEL,
  THANK_ALL_CUE_CONFIRM,
  THANK_ALL_CUE_MESSAGE,
  type TitleSummary,
} from "@cinima/shared";
import PosterImg from "@/components/PosterImg.vue";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import { formatTitleRating } from "@/lib/titleRating";

const props = withDefaults(
  defineProps<{
    title?: TitleSummary | null;
    busy?: boolean;
  }>(),
  { busy: false }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const headingId = useId();
const nameId = useId();
const cueMessage = THANK_ALL_CUE_MESSAGE;
const confirmLabel = THANK_ALL_CUE_CONFIRM;
const cancelLabel = THANK_ALL_CUE_CANCEL;

const labelledBy = computed(() =>
  props.title ? `${nameId} ${headingId}` : headingId
);

const mediaLabel = computed(() => {
  const kind = props.title?.mediaType || props.title?.kind;
  return kind === "tv" ? "TV" : "Movie";
});

function onCancel() {
  if (props.busy) return;
  emit("cancel");
}
</script>

<style scoped>
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: transparent;
}

.confirm-dialog {
  width: min(100%, 22rem);
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.35rem 1.25rem 1.25rem;
  text-align: center;
}

.leave-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.leave-poster {
  width: min(32vw, 6.75rem);
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  flex-shrink: 0;
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.leave-poster :deep(.poster-img),
.leave-poster :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}

.leave-poster-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.82rem;
}

.leave-name {
  margin: 0;
  max-width: 100%;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leave-meta {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.leave-meta .dot {
  opacity: 0.55;
}

.leave-meta .rating {
  color: var(--warning);
  font-weight: 600;
}

.leave-meta .rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.confirm-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text-primary);
}

.confirm-actions {
  display: flex;
  gap: 0.65rem;
  justify-content: center;
}

.confirm-actions .nq-pill-lg {
  flex: 1;
  max-width: 8rem;
}
</style>
