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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import type { PublicProfile, TitleSummary } from "@cinima/shared";
import { profileShareCopy, profileShareUrl } from "@cinima/shared";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import ExploreCinimaPayBar from "@/components/ExploreCinimaPayBar.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import PayTitleModal from "@/components/PayTitleModal.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import UserCard from "@/components/UserCard.vue";
import { isNimiqPay } from "@/lib/nimiqPay";
import { payAppOrigin, payOpenSchemeUrl } from "@/lib/payLinks";

const route = useRoute();

const handle = computed(() => String(route.params.username || ""));
const loading = ref(true);
const profile = ref<PublicProfile | null>(null);
const gateTitle = ref<TitleSummary | null>(null);

const payUrl = computed(() => {
  if (!profile.value?.handle) return payOpenSchemeUrl();
  return payOpenSchemeUrl(profileShareUrl(payAppOrigin(), profile.value.handle));
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
    if (profile.value) {
      document.title = `${profileShareCopy(profile.value.handle)} - Cinima`;
    }
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
  document.title = "Cinima";
});

watch(handle, () => {
  loadProfile();
});
</script>

<style scoped>
.public-profile {
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
</style>
