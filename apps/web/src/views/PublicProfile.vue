<template>
  <div class="public-profile">
    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

    <div v-else-if="profile" class="content">
      <div class="profile-header">
        <Identicon :address="profile.walletAddress" :size="72" alt="Identicon" />
        <h1>{{ displayName(profile.handle, profile.walletAddress) }}</h1>
        <p v-if="profile.handle" class="wallet">{{ abbreviateWallet(profile.walletAddress) }}</p>
        <ActivityHeatmap
          v-if="profile.heatmap?.length"
          class="public-heatmap"
          :days="profile.heatmap"
          title="Activity"
        />
      </div>

      <section class="favorites-section">
        <h2>Recommends ({{ profile.recommends?.length || 0 }})</h2>
        <div v-if="!(profile.recommends && profile.recommends.length)" class="empty">
          No Recommends yet
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in profile.recommends"
            :key="title.id"
            class="media-item"
          >
            <span class="gold-badge" aria-hidden="true">★</span>
            <img
              v-if="title.posterUrl"
              :src="title.posterUrl"
              :alt="title.title"
            />
            <div v-else class="poster-placeholder">
              {{ title.title }}
            </div>
            <div class="media-title">{{ title.title }}</div>
          </div>
        </div>
      </section>

      <section class="favorites-section">
        <h2>Favorites ({{ profile.favorites.length }})</h2>
        <div v-if="profile.favorites.length === 0" class="empty">
          No favorites yet
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in profile.favorites"
            :key="title.id"
            class="media-item"
          >
            <span v-if="title.recommended" class="gold-badge" aria-hidden="true">★</span>
            <img
              v-if="title.posterUrl"
              :src="title.posterUrl"
              :alt="title.title"
            />
            <div v-else class="poster-placeholder">
              {{ title.title }}
            </div>
            <div class="media-title">{{ title.title }}</div>
          </div>
        </div>
      </section>

      <div class="cta-banner nq-card">
        <h3>Join Cinima</h3>
        <p>Discover shows based on your taste</p>
        <a :href="payUrl" class="nq-pill-blue nq-pill-lg">
          Open in Nimiq Pay
        </a>
      </div>
    </div>

    <div v-else class="error">
      Profile not found
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { abbreviateWallet, displayName } from "@nimcharts/shared";
import type { PublicProfile } from "@nimcharts/shared";
import Identicon from "@/components/Identicon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";

const route = useRoute();

const username = computed(() => route.params.username as string);
const loading = ref(true);
const profile = ref<PublicProfile | null>(null);

const payUrl = computed(() => {
  const base = import.meta.env.VITE_PAY_APP_URL || "https://www.nimiq.com/pay/";
  return `${base}?app=${encodeURIComponent(window.location.origin)}`;
});

const loadProfile = async () => {
  loading.value = true;
  try {
    const apiBase = import.meta.env.VITE_API_BASE || "";
    const response = await fetch(`${apiBase}/api/public/${username.value}`);
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

onMounted(loadProfile);
</script>

<style scoped>
.public-profile {
  min-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: calc(var(--top-chrome, 0.85rem) + 1rem) 1rem 2rem;
}

.loading,
.error {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary);
}

.profile-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.5rem;
}

.profile-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.wallet {
  margin: 0;
  font-family: monospace;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.public-heatmap {
  width: 100%;
  margin-top: 0.5rem;
  text-align: left;
}

.favorites-section h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.75rem;
}

.media-item {
  position: relative;
  background: var(--bg-surface);
  border-radius: 10px;
  overflow: hidden;
}

.media-item img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  display: block;
}

.cta-banner {
  margin-top: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.poster-placeholder {
  aspect-ratio: 2/3;
  display: grid;
  place-items: center;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.media-title {
  padding: 0.4rem 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cta-banner h3 {
  margin: 0 0 0.35rem;
}

.cta-banner p {
  margin: 0 0 1rem;
  color: var(--text-secondary);
}

.cta-banner a {
  text-decoration: none;
}
</style>
