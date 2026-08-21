<template>
  <div class="share-modal" role="presentation" @click.self="$emit('close')">
    <div
      class="share-dialog nq-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-share-sheet"
    >
      <button type="button" class="share-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <h2 id="title-share-sheet">Share</h2>

      <template v-if="!handle">
        <p>Claim a shareable handle on Me so this Title Share can name you.</p>
        <button type="button" class="nq-pill-blue nq-pill-stretch" @click="$emit('claim')">
          Go to Me
        </button>
      </template>

      <template v-else>
        <p>{{ copy }}</p>
        <div class="share-actions">
          <button type="button" class="nq-pill-secondary nq-pill-stretch" @click="copyLink">
            <NqIcon :name="copied ? 'check' : 'copy'" :size="18" />
            {{ copied ? "Copied" : "Copy link" }}
          </button>
          <button
            v-if="canNativeShare"
            type="button"
            class="nq-pill-blue nq-pill-stretch"
            @click="nativeShare"
          >
            <NqIcon name="duotone-paper-plane" :size="18" />
            Share
          </button>
          <a
            class="nq-pill-secondary nq-pill-stretch"
            :href="xUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <NqIcon name="logos-twitter-mono" :size="18" />
            X
          </a>
          <a
            class="nq-pill-secondary nq-pill-stretch"
            :href="fbUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <NqIcon name="logos-facebook-mono" :size="18" />
            Facebook
          </a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  facebookShareUrl,
  titleShareCopy,
  titleShareUrl,
  xShareUrl,
  type MediaType,
} from "@cinima/shared";
import NqIcon from "@/components/NqIcon.vue";

const props = defineProps<{
  handle: string | null;
  titleName: string;
  mediaType: MediaType;
  tmdbId: number;
}>();

defineEmits<{
  close: [];
  claim: [];
}>();

const copied = ref(false);
const canNativeShare = computed(
  () => typeof navigator !== "undefined" && typeof navigator.share === "function"
);

const shareUrl = computed(() => {
  if (!props.handle) return "";
  return titleShareUrl(window.location.origin, props.handle, props.mediaType, props.tmdbId);
});

const copy = computed(() =>
  props.handle ? titleShareCopy(props.handle, props.titleName) : ""
);

const xUrl = computed(() => xShareUrl(shareUrl.value, copy.value));
const fbUrl = computed(() => facebookShareUrl(shareUrl.value, copy.value));

const copyLink = async () => {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
};

const nativeShare = async () => {
  if (!shareUrl.value || !navigator.share) return;
  try {
    await navigator.share({
      title: copy.value,
      text: copy.value,
      url: shareUrl.value,
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

.share-dialog p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.share-actions .nq-pill-stretch,
.share-actions a.nq-pill-stretch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  text-decoration: none;
}
</style>
