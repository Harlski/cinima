<template>
  <div class="title-share">
    <AppBrandHeader />

    <div class="share-main">
      <div v-if="loading" class="app-column loading">
        <NqSpinner />
      </div>

      <div v-else-if="payload" class="app-column content">
        <div class="invite-row">
          <RouterLink class="invite-identity" :to="profilePath" :aria-label="`${payload.handle} profile`">
            <Identicon
              :address="payload.walletAddress"
              :size="40"
              :alt="`${payload.handle} identicon`"
            />
            <span class="invite-handle">{{ payload.handle }}</span>
          </RouterLink>
          <p class="invite">wants you to check out</p>
        </div>

        <GoldGlowShell radius="12px">
          <button
            type="button"
            class="hero poster-press"
            :aria-label="payload.title.title"
            @click="onSelectTitle"
          >
            <PosterImg
              v-if="payload.title.posterUrl"
              :src="payload.title.posterUrl"
              :alt="payload.title.title"
            />
            <div v-else class="hero-fallback">{{ payload.title.title }}</div>
          </button>
        </GoldGlowShell>

        <div class="meta">
          <h2>{{ payload.title.title }}</h2>
          <p class="meta-line">
            <span v-if="payload.title.year">{{ payload.title.year }}</span>
            <span v-if="payload.title.year" class="dot">·</span>
            <span>{{ mediaLabel }}</span>
            <span class="dot">·</span>
            <span class="rating" :class="{ muted: payload.title.rating == null }">
              {{ formatTitleRating(payload.title.rating) }}
            </span>
          </p>
          <p v-if="payload.title.overview" class="overview">
            {{ payload.title.overview }}
          </p>
          <button
            v-if="payload.title.overview"
            type="button"
            class="read-more"
            @click="onSelectTitle"
          >
            Read more
          </button>
        </div>

        <RouterLink class="nq-pill-blue nq-pill-lg nq-pill-stretch profile-cta" :to="profilePath">
          View their profile
        </RouterLink>

        <TmdbAttribution variant="compact" />
      </div>

      <div v-else class="app-column error">
        Share link not found
      </div>
    </div>

    <ExploreCinimaPayBar :already-installed-url="payUrl" />

    <PayTitleModal
      v-if="gateTitle"
      :title="gateTitle"
      :pay-url="payUrl"
      @close="gateTitle = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  titleShareCopy,
  type ResolvedShareLink,
  type ResolvedTitleShareLink,
  type TitleSummary,
} from "@cinima/shared";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import ExploreCinimaPayBar from "@/components/ExploreCinimaPayBar.vue";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import Identicon from "@/components/Identicon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import PayTitleModal from "@/components/PayTitleModal.vue";
import PosterImg from "@/components/PosterImg.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import { isNimiqPay } from "@/lib/nimiqPay";
import { payOpenSchemeUrl, payOpenTitleUrl } from "@/lib/payLinks";
import { formatTitleRating } from "@/lib/titleRating";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const payload = ref<ResolvedTitleShareLink | null>(null);
const gateTitle = ref<TitleSummary | null>(null);

const code = computed(() => String(route.params.code || "").toLowerCase());
const profilePath = computed(() => (payload.value ? `/${payload.value.handle}` : "/"));
const invitation = computed(() =>
  payload.value
    ? titleShareCopy(payload.value.handle, payload.value.title.title)
    : ""
);

const mediaLabel = computed(() =>
  payload.value?.title.mediaType === "tv" ? "TV" : "Movie"
);

const payUrl = computed(() => {
  if (!payload.value) return payOpenSchemeUrl();
  return payOpenTitleUrl(payload.value.title.id);
});

const onSelectTitle = () => {
  if (!payload.value || isNimiqPay()) return;
  gateTitle.value = payload.value.title;
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") gateTitle.value = null;
};

const loadShare = async () => {
  loading.value = true;
  payload.value = null;
  try {
    const apiBase = import.meta.env.VITE_API_BASE || "";
    const response = await fetch(`${apiBase}/api/s/${encodeURIComponent(code.value)}`);
    if (!response.ok) return;
    const body = (await response.json()) as ResolvedShareLink;
    if (body.kind === "profile") {
      await router.replace({ name: "public", params: { username: body.handle } });
      return;
    }
    payload.value = body;
    document.title = invitation.value;
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

watch(code, loadShare, { immediate: true });
</script>

<style scoped>
.title-share {
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
  gap: 0.7rem;
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

.rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.hero {
  display: block;
  width: min(36vw, 8.75rem);
  aspect-ratio: 2 / 3;
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  flex-shrink: 0;
  cursor: pointer;
  color: inherit;
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
  -webkit-tap-highlight-color: transparent;
}

.hero img,
.hero :deep(.poster-img) {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-weight: 700;
}

.meta {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  text-align: center;
  min-width: 0;
}

.meta h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.meta-line {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.dot {
  opacity: 0.55;
  padding: 0 0.15rem;
}

.rating {
  color: var(--warning);
  font-weight: 600;
}

.overview {
  margin: 0;
  max-width: 36rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.read-more {
  margin: 0.15rem 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--gold);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.read-more:active {
  opacity: 0.75;
}

.profile-cta {
  margin-top: 0.35rem;
  max-width: 19.25rem;
  text-align: center;
  color: #fff;
}
</style>
