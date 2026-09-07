<template>
  <div class="watchlist-share">
    <AppBrandHeader />

    <div class="share-main">
      <div v-if="loading" class="app-column loading">
        <LoadingWait />
      </div>

      <div v-else-if="payload" class="app-column content">
        <div class="invite-row">
          <RouterLink class="invite-identity" :to="profilePath" :aria-label="`${handle} profile`">
            <Identicon
              :address="payload.walletAddress"
              :size="40"
              :alt="`${handle} identicon`"
            />
            <span class="invite-handle">{{ handle }}</span>
          </RouterLink>
          <p class="invite">{{ inviteLine }}</p>
        </div>

        <PosterSlider
          :titles="payload.titles"
          gold="recommended"
          fit
          :max-rows="4"
          empty="This Watchlist is empty right now"
          @select="onSelectTitle"
        />

        <RouterLink class="nq-pill-blue nq-pill-lg nq-pill-stretch profile-cta" :to="profilePath">
          View their profile
        </RouterLink>

        <TmdbAttribution variant="compact" />
      </div>

      <div v-else class="app-column error">
        Watchlist Share not found
      </div>
    </div>

    <ExploreCinimaPayBar :already-installed-url="payUrl" />

    <PayTitleModal
      v-if="gateTitle"
      :title="gateTitle"
      :pay-url="payOpenTitleUrl(gateTitle.id)"
      @close="gateTitle = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  watchlistShareCopy,
  watchlistShareUrl,
  type TitleSummary,
  type WatchlistShare,
} from "@cinima/shared";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import ExploreCinimaPayBar from "@/components/ExploreCinimaPayBar.vue";
import Identicon from "@/components/Identicon.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import PayTitleModal from "@/components/PayTitleModal.vue";
import PosterSlider from "@/components/PosterSlider.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import { isNimiqPay } from "@/lib/nimiqPay";
import { payAppOrigin, payOpenHttpsUrl, payOpenTitleUrl } from "@/lib/payLinks";
import { recordShareVisit, shareVisitPayIntentKey } from "@/lib/shareVisit";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const payload = ref<WatchlistShare | null>(null);
const gateTitle = ref<TitleSummary | null>(null);

const handle = computed(() => String(route.params.handle || ""));
const profilePath = computed(() => `/${handle.value}`);
const inviteLine = computed(() =>
  payload.value ? watchlistShareCopy(payload.value.handle) : ""
);

const payUrl = computed(() => {
  if (!payload.value?.handle) return payOpenHttpsUrl();
  return payOpenHttpsUrl(watchlistShareUrl(payAppOrigin(), payload.value.handle));
});

function beaconOpen() {
  if (!handle.value) return;
  recordShareVisit({ kind: "watchlist", handle: handle.value });
}

function beaconPayIntent() {
  if (!handle.value) return;
  recordShareVisit({ kind: "watchlist", handle: handle.value, intent: "pay_cta" });
}

provide(shareVisitPayIntentKey, beaconPayIntent);

const onSelectTitle = (title: TitleSummary) => {
  if (isNimiqPay()) {
    router.push({ name: "title", params: { id: title.id } });
    return;
  }
  gateTitle.value = title;
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") gateTitle.value = null;
};

const loadShare = async () => {
  beaconOpen();
  loading.value = true;
  payload.value = null;
  try {
    const apiBase = import.meta.env.VITE_API_BASE || "";
    const response = await fetch(
      `${apiBase}/api/public/${encodeURIComponent(handle.value)}/list`
    );
    if (!response.ok) return;
    payload.value = await response.json();
    if (payload.value) {
      document.title = watchlistShareCopy(payload.value.handle);
    }
  } catch {
    payload.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  document.title = "Cinima";
});

watch(handle, loadShare, { immediate: true });
</script>

<style scoped>
.watchlist-share {
  position: relative;
  z-index: 1;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.share-main {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  overflow-anchor: none;
  -webkit-overflow-scrolling: touch;
  isolation: isolate;
}

.loading,
.error {
  text-align: center;
  padding: 4rem 0;
  color: var(--text-secondary);
}

.content {
  padding-top: 1.25rem;
  padding-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.invite {
  margin: 0;
  max-width: 36rem;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 600;
}

.invite-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.invite-identity {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: inherit;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.invite-handle {
  font-weight: 700;
  font-size: 1.05rem;
}

.profile-cta {
  margin-top: 0.35rem;
  max-width: 19.25rem;
  text-align: center;
  color: #fff;
}

.content :deep(.poster-slider),
.content :deep(.empty) {
  width: 100%;
}
</style>
