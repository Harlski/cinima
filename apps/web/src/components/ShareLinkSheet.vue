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

      <div class="preview-card" :style="previewStyle">
        <div v-if="imageUrl" class="preview-image">
          <PosterImg :src="imageUrl" :alt="headline" />
        </div>
        <div v-else class="preview-image preview-fallback">
          <NqIcon name="duotone-paper-plane" :size="28" />
        </div>
      </div>

      <label class="url-field">
        <span class="url-label">Link</span>
        <input class="url-input" :value="url" readonly tabindex="0" />
      </label>

      <div class="share-actions">
        <GoldGlowShell radius="0.9rem" class="share-copy-glow">
          <button type="button" class="share-copy" @click="copyLink">
            <NqIcon :name="copied ? 'check' : 'copy'" :size="18" />
            {{ copied ? "Copied" : "Copy link" }}
          </button>
        </GoldGlowShell>
        <button
          v-if="canNativeShare"
          type="button"
          class="nq-pill-secondary nq-pill-stretch share-native"
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
import {
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
  SITE_THEME_COLOR,
} from "@cinima/shared";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import NqIcon from "@/components/NqIcon.vue";
import PosterImg from "@/components/PosterImg.vue";
import { copyShareLink } from "@/lib/shareLinkCopy";

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

const canNativeShare = computed(
  () => typeof navigator !== "undefined" && typeof navigator.share === "function"
);

const previewStyle = computed(() => ({
  aspectRatio: `${SHARE_OG_IMAGE_WIDTH} / ${SHARE_OG_IMAGE_HEIGHT}`,
  background: SITE_THEME_COLOR,
}));

const copyLink = async () => {
  if (!props.url) return;
  const ok = await copyShareLink(props.url);
  if (!ok) return;
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1600);
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
  width: min(100%, 26rem);
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
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.preview-image {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: inherit;
}

.preview-image :deep(.poster-img),
.preview-image :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.preview-fallback {
  display: grid;
  place-items: center;
  color: var(--text-secondary);
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
  padding: 0.8rem 0.95rem;
  border: 0;
  border-radius: 0.75rem;
  background: #fff;
  color: #1a1a1a;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1.35;
  -webkit-user-select: text;
  user-select: text;
}

.url-input:focus {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.share-copy-glow {
  display: block;
  width: 100%;
}

.share-copy-glow :deep(.gold-glow-content) {
  width: 100%;
}

.share-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1.2rem 1.65rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.9rem;
  background: var(--colors-neutral-200);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  -webkit-tap-highlight-color: transparent;
}

.share-copy:hover {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
}

.share-native {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}
</style>
