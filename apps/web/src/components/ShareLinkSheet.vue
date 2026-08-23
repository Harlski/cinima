<template>
  <div class="share-modal" role="presentation" @click.self="$emit('close')">
    <div
      class="share-dialog nq-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-link-sheet"
    >
      <button type="button" class="share-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <h2 id="share-link-sheet">{{ title }}</h2>

      <p v-if="hint" class="hint">{{ hint }}</p>

      <div class="preview-card nq-card">
        <div v-if="imageUrl" class="preview-image">
          <PosterImg :src="imageUrl" :alt="headline" />
        </div>
        <div v-else class="preview-image preview-fallback">
          <NqIcon name="duotone-paper-plane" :size="28" />
        </div>
        <div class="preview-copy">
          <p class="preview-headline">{{ headline }}</p>
          <p class="preview-description">{{ description }}</p>
          <p class="preview-url">{{ displayUrl }}</p>
        </div>
      </div>

      <label class="url-field">
        <span class="url-label">Link</span>
        <input
          ref="urlInput"
          class="nq-input-box url-input"
          :value="url"
          readonly
          @focus="selectUrl"
          @click="selectUrl"
        />
      </label>

      <div class="share-actions">
        <button type="button" class="nq-pill-blue nq-pill-stretch" @click="copyLink">
          <NqIcon :name="copied ? 'check' : 'copy'" :size="18" />
          {{ copied ? "Copied" : "Copy link" }}
        </button>
        <button
          v-if="canNativeShare"
          type="button"
          class="nq-pill-secondary nq-pill-stretch"
          @click="nativeShare"
        >
          <NqIcon name="duotone-paper-plane" :size="18" />
          Share
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import NqIcon from "@/components/NqIcon.vue";
import PosterImg from "@/components/PosterImg.vue";

const props = defineProps<{
  title?: string;
  hint?: string;
  headline: string;
  description: string;
  url: string;
  imageUrl?: string | null;
}>();

defineEmits<{
  close: [];
}>();

const copied = ref(false);
const urlInput = ref<HTMLInputElement | null>(null);

const canNativeShare = computed(
  () => typeof navigator !== "undefined" && typeof navigator.share === "function"
);

const displayUrl = computed(() => {
  try {
    return new URL(props.url).host;
  } catch {
    return props.url;
  }
});

const selectUrl = () => {
  urlInput.value?.select();
};

const copyLink = async () => {
  if (!props.url) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.url);
    } else {
      selectUrl();
      document.execCommand("copy");
    }
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    selectUrl();
  }
};

const nativeShare = async () => {
  if (!props.url || !navigator.share) return;
  try {
    await navigator.share({
      title: props.headline,
      text: props.description,
      url: props.url,
    });
  } catch {
    /* user cancelled */
  }
};
</script>

<style scoped>
.share-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.share-dialog {
  position: relative;
  width: min(100%, 24rem);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.25rem 1.15rem 1.15rem;
}

.share-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  display: grid;
  place-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.share-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
}

.hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
}

.preview-card {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.75rem;
  overflow: hidden;
  text-align: left;
}

.preview-image {
  width: 5.5rem;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.preview-image :deep(.poster-img),
.preview-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.preview-fallback {
  display: grid;
  place-items: center;
  color: var(--text-secondary);
}

.preview-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.preview-headline {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-description {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.preview-url {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.85;
}

.url-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.url-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.url-input {
  width: 100%;
  font-size: 0.82rem;
  -webkit-user-select: text;
  user-select: text;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.share-actions .nq-pill-stretch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}
</style>
