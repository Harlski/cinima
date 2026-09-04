<template>
  <ShareLinkSheet
    v-if="handle && !loading && shareUrl && preview"
    title="Share Watchlist"
    :headline="preview.headline"
    :description="preview.description"
    :url="preview.url"
    :image-url="preview.imageUrl"
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
      aria-labelledby="watchlist-share-sheet"
    >
      <button type="button" class="share-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <h2 id="watchlist-share-sheet">Share Watchlist</h2>
      <p>Claim a shareable handle on Me so friends can help you pick what's next.</p>
      <button type="button" class="nq-pill-blue nq-pill-stretch" @click="$emit('claim')">
        Go to Me
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { shortShareUrl, type ShareLinkCreated } from "@cinima/shared";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import ShareLinkSheet from "@/components/ShareLinkSheet.vue";
import { useApi } from "@/composables/useApi";
import { watchlistShareSheetPreview } from "@/lib/watchlistShare";
import { payAppOrigin } from "@/lib/payLinks";
import { siteOrigin } from "@/lib/siteMeta";
import { useMarqueeStore } from "@/stores/marquee";

const props = defineProps<{
  handle: string | null;
}>();

defineEmits<{
  close: [];
  claim: [];
}>();

const { request } = useApi();
const loading = ref(true);
const shareUrl = ref("");

const preview = computed(() => {
  if (!props.handle || !shareUrl.value) return null;
  return watchlistShareSheetPreview({
    origin: siteOrigin,
    handle: props.handle,
    shareUrl: shareUrl.value,
  });
});

onMounted(async () => {
  if (!props.handle) {
    loading.value = false;
    return;
  }
  try {
    const data = await request<ShareLinkCreated>("/share/watchlist", {
      method: "POST",
    });
    shareUrl.value = shortShareUrl(payAppOrigin(), data.code);
    if (data.earnedAchievements?.length) {
      useMarqueeStore().enqueue(data.earnedAchievements);
    }
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
