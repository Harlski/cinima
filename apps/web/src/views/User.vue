<template>
  <div class="user">
    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>

    <div v-else-if="profile" class="content">
      <UserCard
        :wallet-address="profile.walletAddress"
        :handle="displayName(profile.handle, profile.walletAddress)"
        :x-handle="profile.xHandle"
        :follower-count="profile.followerCount"
        :following-count="profile.followingCount"
        :achievement-count="profile.achievementCount ?? 0"
        :achievement-open="true"
        :recommends="profile.recommends || []"
        :identicon-to="
          profile.handle
            ? { name: 'public', params: { username: profile.handle } }
            : null
        "
        identicon-label="View Public Profile"
        @open-credits="openCredits"
      >
        <template v-if="!profile.isSelf" #actions>
          <div class="profile-actions">
            <button
              v-if="showGuestbookThanks"
              type="button"
              class="nq-pill-secondary thanks-action"
              @click="thankProfile"
            >
              Thanks
            </button>
            <TourSpotlight :id="TOUR_SPOTLIGHT.userFollow" radius="999px">
              <button
                type="button"
                :class="profile.isFollowing ? 'nq-pill-secondary' : 'nq-pill-blue'"
                class="follow-action"
                :disabled="followBusy"
                :aria-busy="followBusy"
                :data-tour="TOUR_SPOTLIGHT.userFollow"
                @click="toggleFollow"
              >
                <span v-if="followBusy" aria-hidden="true">
                  <NqSpinner :size="16" label="" />
                </span>
                {{
                  acceptedWaitLabel(
                    profile.isFollowing ? "Following" : "Follow",
                    followBusy
                  )
                }}
              </button>
            </TourSpotlight>
          </div>
        </template>
      </UserCard>

      <GuestbookList
        :items="profile.guestbook"
        :can-open-all="profile.isSelf && profile.guestbook.length >= GUESTBOOK_PREVIEW_LIMIT"
      />

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

      <ProfileComments :wallet-address="profile.walletAddress" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { ACTIVITY_UI_VISIBLE, GUESTBOOK_PREVIEW_LIMIT, displayName } from "@cinima/shared";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";
import GuestbookList from "@/components/GuestbookList.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import ProfileComments from "@/components/ProfileComments.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import UserCard from "@/components/UserCard.vue";
import { TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import { useMarqueeStore } from "@/stores/marquee";
import { useGuidedTourStore } from "@/stores/guidedTour";
import { useUserSendStore } from "@/stores/userSend";
import type { AchievementKind, HandleProfile } from "@cinima/shared";

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const tour = useGuidedTourStore();
const userSend = useUserSendStore();

const wallet = computed(() => decodeURIComponent(String(route.params.wallet || "")));
const loading = ref(true);
const followBusy = ref(false);
const profile = ref<HandleProfile | null>(null);
const showGuestbookThanks = computed(
  () => !!profile.value && !profile.value.isSelf && !profile.value.guestbookThanked && !tour.active
);

const loadProfile = async (opts?: { quiet?: boolean }) => {
  if (!opts?.quiet) loading.value = true;
  try {
    profile.value = await request<HandleProfile>(`/users/${encodeURIComponent(wallet.value)}`);
  } finally {
    loading.value = false;
  }
};

function thankProfile() {
  if (!profile.value || !showGuestbookThanks.value) return;
  userSend.offer({
    kind: "guestbook",
    toWallet: profile.value.walletAddress,
    handle: profile.value.handle,
  });
}

watch(
  () => userSend.lastAttached,
  (sent) => {
    if (!sent || sent.kind !== "guestbook") return;
    if (sent.toWallet !== profile.value?.walletAddress) return;
    void loadProfile({ quiet: true });
  }
);

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
      const data = await request<{ earnedAchievements?: AchievementKind[] }>(
        `/users/${w}/follow`,
        { method: "POST" }
      );
      profile.value = {
        ...profile.value,
        isFollowing: true,
        followerCount: profile.value.followerCount + 1,
      };
      if (data.earnedAchievements?.length) {
        useMarqueeStore().enqueue(data.earnedAchievements);
      }
    }
  } finally {
    followBusy.value = false;
  }
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

const openCredits = () => {
  if (!profile.value) return;
  router.push({ name: "credits", params: { wallet: profile.value.walletAddress } });
};

onMounted(loadProfile);
watch(wallet, () => {
  void loadProfile();
});
</script>

<style scoped>
.user {
  min-height: 100%;
  padding-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.follow-action,
.thanks-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.content {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
</style>
