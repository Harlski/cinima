<template>
  <div class="user">
    <header class="detail-header">
      <button @click="goBack" class="back-button" type="button">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1>{{ handle || "User" }}</h1>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="profile" class="content">
      <div class="profile-section">
        <Identicon :address="profile.walletAddress" :size="64" alt="Identicon" />
        <div class="profile-info">
          <h2>{{ displayName(profile.handle, profile.walletAddress) }}</h2>
          <p v-if="profile.handle" class="wallet">{{ abbreviateWallet(profile.walletAddress) }}</p>
          <p class="stats">
            {{ profile.followerCount }} followers · {{ profile.followingCount }} following
          </p>
        </div>
        <button
          v-if="!profile.isSelf"
          type="button"
          class="follow-btn"
          :class="{ following: profile.isFollowing }"
          :disabled="followBusy"
          @click="toggleFollow"
        >
          {{ profile.isFollowing ? "Following" : "Follow" }}
        </button>
      </div>

      <ActivityHeatmap :days="profile.heatmap" title="Activity" />

      <section class="favorites-section">
        <h3>Recommends ({{ profile.recommends?.length || 0 }})</h3>
        <div v-if="!(profile.recommends && profile.recommends.length)" class="empty">
          No Recommends yet
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in profile.recommends"
            :key="title.id"
            class="media-item poster-press"
            @click="goToTitle(title.id)"
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
          </div>
        </div>
      </section>

      <section class="favorites-section">
        <h3>Favorites ({{ profile.favorites.length }})</h3>
        <div v-if="profile.favorites.length === 0" class="empty">
          No favorites yet
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in profile.favorites"
            :key="title.id"
            class="media-item poster-press"
            @click="goToTitle(title.id)"
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
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { displayName, abbreviateWallet } from "@nimcharts/shared";
import type { PublicProfile } from "@nimcharts/shared";
import Identicon from "@/components/Identicon.vue";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";

const route = useRoute();
const router = useRouter();
const { request } = useApi();

const wallet = computed(() => decodeURIComponent(String(route.params.wallet || "")));
const loading = ref(true);
const followBusy = ref(false);
const profile = ref<PublicProfile | null>(null);
const handle = computed(() => profile.value?.handle || null);

const loadProfile = async () => {
  loading.value = true;
  try {
    profile.value = await request<PublicProfile>(`/users/${encodeURIComponent(wallet.value)}`);
  } finally {
    loading.value = false;
  }
};

const toggleFollow = async () => {
  if (!profile.value || profile.value.isSelf) return;
  followBusy.value = true;
  try {
    const w = encodeURIComponent(profile.value.walletAddress);
    if (profile.value.isFollowing) {
      await request(`/users/${w}/follow`, { method: "DELETE" });
      profile.value = {
        ...profile.value,
        isFollowing: false,
        followerCount: Math.max(0, profile.value.followerCount - 1),
      };
    } else {
      await request(`/users/${w}/follow`, { method: "POST" });
      profile.value = {
        ...profile.value,
        isFollowing: true,
        followerCount: profile.value.followerCount + 1,
      };
    }
  } finally {
    followBusy.value = false;
  }
};

const goBack = () => {
  router.back();
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

onMounted(loadProfile);
watch(wallet, loadProfile);
</script>

<style scoped>
.user {
  min-height: 100%;
  padding-bottom: 2rem;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-button {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button svg {
  width: 24px;
  height: 24px;
}

.detail-header h1 {
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.loading {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-section {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-surface);
  border-radius: 16px;
  align-items: center;
}

.profile-info {
  flex: 1;
  min-width: 140px;
}

.profile-info h2 {
  margin: 0 0 0.35rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.wallet {
  margin: 0 0 0.35rem 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.stats {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.follow-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.follow-btn.following {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border);
}

.favorites-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
}

.media-item {
  position: relative;
  aspect-ratio: 2/3;
  background: var(--bg-surface);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gold-badge {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  z-index: 2;
  width: 1.4rem;
  height: 1.4rem;
  display: grid;
  place-content: center;
  border-radius: 999px;
  background: #c9a227;
  color: #0a0a0f;
  font-size: 0.75rem;
  line-height: 1;
}

.poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
