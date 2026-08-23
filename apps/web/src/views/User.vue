<template>
  <div class="user">
    <header class="detail-header">
      <button @click="goBack" class="back-button" type="button" aria-label="Back">
        <NqIcon name="arrow-left" :size="24" />
      </button>
      <h1>{{ handle || "User" }}</h1>
    </header>

    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

    <div v-else-if="profile" class="content">
      <UserCard
        :wallet-address="profile.walletAddress"
        :handle="displayName(profile.handle, profile.walletAddress)"
        :x-handle="profile.xHandle"
        :follower-count="profile.followerCount"
        :following-count="profile.followingCount"
        wallet-display="abbrev"
        :avatar-size="64"
      >
        <template v-if="!profile.isSelf" #actions>
          <button
            type="button"
            :class="profile.isFollowing ? 'nq-pill-secondary' : 'nq-pill-blue'"
            :disabled="followBusy"
            @click="toggleFollow"
          >
            {{ profile.isFollowing ? "Following" : "Follow" }}
          </button>
        </template>
      </UserCard>

      <ActivityHeatmap
        v-if="ACTIVITY_UI_VISIBLE"
        :days="profile.heatmap"
        title="Activity"
      />

      <ProfileTaste
        :favorites="profile.favorites"
        :recommends="profile.recommends || []"
        @select="(title) => goToTitle(title.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { ACTIVITY_UI_VISIBLE, displayName } from "@cinima/shared";
import type { PublicProfile } from "@cinima/shared";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import UserCard from "@/components/UserCard.vue";

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
  padding: 1rem 0;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
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

.back-button :deep(.nq-icon) {
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
  padding: 3rem 0;
  color: var(--text-secondary);
}

.content {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
