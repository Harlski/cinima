<template>
  <div class="public-profile">
    <AppBrandHeader />

    <div class="public-main">
      <div v-if="loading" class="app-column loading">
        <NqSpinner />
      </div>

      <div v-else-if="profile" class="app-column content">
        <UserCard
          :wallet-address="profile.walletAddress"
          :handle="profile.handle"
          :x-handle="profile.xHandle"
          wallet-display="copy"
        />

        <ProfileTaste
          :favorites="profile.favorites"
          :recommends="profile.recommends || []"
          @select="onSelectTitle"
        />

        <TmdbAttribution variant="compact" />
      </div>

      <div v-else class="app-column error">
        Profile not found
      </div>
    </div>

    <nav class="pay-bar">
      <div class="app-column">
        <a :href="payUrl" class="nq-pill-blue nq-pill-lg nq-pill-stretch pay-cta">
          Explore CINIMA on NIMIQ PAY
        </a>
      </div>
    </nav>

    <PayTitleModal
      v-if="gateTitle"
      :title="gateTitle"
      :pay-url="payUrl"
      @close="gateTitle = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import type { PublicProfile, TitleSummary } from "@cinima/shared";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import PayTitleModal from "@/components/PayTitleModal.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import UserCard from "@/components/UserCard.vue";
import { isNimiqPay } from "@/lib/nimiqPay";

const route = useRoute();

const handle = computed(() => String(route.params.username || ""));
const loading = ref(true);
const profile = ref<PublicProfile | null>(null);
const gateTitle = ref<TitleSummary | null>(null);

const payUrl = computed(() => {
  const base = import.meta.env.VITE_PAY_APP_URL || "https://www.nimiq.com/pay/";
  return `${base}?app=${encodeURIComponent(window.location.origin)}`;
});

const onSelectTitle = (title: TitleSummary) => {
  if (isNimiqPay()) return;
  gateTitle.value = title;
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") gateTitle.value = null;
};

const loadProfile = async () => {
  loading.value = true;
  try {
    const apiBase = import.meta.env.VITE_API_BASE || "";
    const response = await fetch(`${apiBase}/api/public/${handle.value}`);
    if (!response.ok) {
      profile.value = null;
      return;
    }
    profile.value = await response.json();
  } catch {
    profile.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadProfile();
  window.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.public-profile {
  --pay-bar-pad-top: 0.75rem;
  --pay-bar-pad-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  position: relative;
  z-index: 1;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.public-main {
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
  gap: 1.5rem;
}

.pay-bar {
  position: relative;
  flex-shrink: 0;
  z-index: 50;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  padding-top: var(--pay-bar-pad-top);
  padding-bottom: var(--pay-bar-pad-bottom);
}

.pay-cta {
  text-align: center;
  letter-spacing: 0.02em;
  color: #fff;
}
</style>
