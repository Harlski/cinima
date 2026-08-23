<template>
  <ShareLinkSheet
    v-if="handle && !loading && shareUrl"
    title="Share"
    :hint="copy"
    :headline="copy"
    :description="titleName"
    :url="shareUrl"
    :image-url="posterUrl"
    @close="$emit('close')"
  />

  <div v-else-if="handle && loading" class="share-modal" role="presentation" @click.self="$emit('close')">
    <div class="share-dialog nq-card" role="dialog" aria-modal="true">
      <NqSpinner />
    </div>
  </div>

  <div v-else class="share-modal" role="presentation" @click.self="$emit('close')">
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
      <p>Claim a shareable handle on Me so this Title Share can name you.</p>
      <button type="button" class="nq-pill-blue nq-pill-stretch" @click="$emit('claim')">
        Go to Me
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  shortShareUrl,
  titleShareCopy,
  type MediaType,
  type ShareLinkCreated,
} from "@cinima/shared";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import ShareLinkSheet from "@/components/ShareLinkSheet.vue";
import { useApi } from "@/composables/useApi";

const props = defineProps<{
  handle: string | null;
  titleName: string;
  mediaType: MediaType;
  tmdbId: number;
  posterUrl?: string | null;
}>();

defineEmits<{
  close: [];
  claim: [];
}>();

const { request } = useApi();
const loading = ref(true);
const shareUrl = ref("");

const copy = computed(() =>
  props.handle ? titleShareCopy(props.handle, props.titleName) : ""
);

onMounted(async () => {
  if (!props.handle) {
    loading.value = false;
    return;
  }
  try {
    const data = await request<ShareLinkCreated>("/share/title", {
      method: "POST",
      body: JSON.stringify({
        mediaType: props.mediaType,
        tmdbId: props.tmdbId,
      }),
    });
    shareUrl.value = shortShareUrl(window.location.origin, data.code);
  } catch {
    shareUrl.value = "";
  } finally {
    loading.value = false;
  }
});
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
</style>
