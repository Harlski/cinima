<template>
  <div class="studio">
    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>

    <div v-else-if="snapshot" class="content">
      <h1>Studio</h1>
      <p class="lede">How people are using Cinima.</p>

      <div class="stats">
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.users }}</strong>
          <span>Handles</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.signedUpToday }}</strong>
          <span>Signed up today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.activeToday }}</strong>
          <span>Active today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ formatActiveMs(snapshot.totals.activeMsToday) }}</strong>
          <span>Presence today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.searchesToday }}</strong>
          <span>Searches today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.viewsToday }}</strong>
          <span>Title views today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.sharesToday }}</strong>
          <span>Shares today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.followsToday }}</strong>
          <span>Follows today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.favorites }}</strong>
          <span>Favorites</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.recommends }}</strong>
          <span>Recommends</span>
        </div>
      </div>

      <section class="nq-card block">
        <h2>Signups</h2>
        <ul v-if="signupDays.length" class="rows">
          <li v-for="day in signupDays" :key="day.date">
            <span>{{ day.date }}</span>
            <span>{{ day.count }}</span>
          </li>
        </ul>
        <ul v-if="snapshot.recentSignups.length" class="rows rows--people">
          <li v-for="row in snapshot.recentSignups" :key="row.walletAddress">
            <span>{{ label(row) }}</span>
            <span>{{ when(row.createdAt) }}</span>
          </li>
        </ul>
        <p v-if="!signupDays.length && !snapshot.recentSignups.length" class="empty">
          No signups yet.
        </p>
      </section>

      <section class="nq-card block">
        <h2>Searches</h2>
        <p v-if="!snapshot.topSearches.length && !snapshot.recentSearches.length" class="empty">
          No searches yet.
        </p>
        <ul v-if="snapshot.topSearches.length" class="rows">
          <li v-for="row in snapshot.topSearches" :key="row.query">
            <span>{{ row.query }}</span>
            <span>{{ row.count }}</span>
          </li>
        </ul>
        <ul v-if="snapshot.recentSearches.length" class="rows rows--people">
          <li v-for="(row, i) in snapshot.recentSearches" :key="`${row.walletAddress}-${i}`">
            <span>{{ label(row) }} · {{ row.query }}</span>
            <span>{{ when(row.createdAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="nq-card block">
        <h2>Views</h2>
        <p v-if="!snapshot.topViews.length && !snapshot.recentViews.length" class="empty">
          No title views yet.
        </p>
        <ul v-if="snapshot.topViews.length" class="rows">
          <li v-for="row in snapshot.topViews" :key="row.titleId">
            <span>{{ row.title || row.titleId }}</span>
            <span>{{ row.count }}</span>
          </li>
        </ul>
        <ul v-if="snapshot.recentViews.length" class="rows rows--people">
          <li v-for="(row, i) in snapshot.recentViews" :key="`${row.walletAddress}-${i}`">
            <span>{{ label(row) }} · {{ row.title || row.titleId }}</span>
            <span>{{ when(row.createdAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="nq-card block">
        <h2>Shares</h2>
        <p v-if="!snapshot.topShares.length && !snapshot.recentShares.length" class="empty">
          No shares yet.
        </p>
        <ul v-if="snapshot.topShares.length" class="rows">
          <li v-for="row in snapshot.topShares" :key="row.titleId">
            <span>{{ row.title || row.titleId }}</span>
            <span>{{ row.count }}</span>
          </li>
        </ul>
        <ul v-if="snapshot.recentShares.length" class="rows rows--people">
          <li v-for="(row, i) in snapshot.recentShares" :key="`${row.walletAddress}-${i}`">
            <span>
              {{ label(row) }} ·
              {{ row.kind === "profile" ? "profile" : row.title || "title" }}
            </span>
            <span>{{ when(row.createdAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="nq-card block">
        <h2>Follows</h2>
        <p v-if="!snapshot.recentFollows.length" class="empty">No follows yet.</p>
        <ul v-else class="rows rows--people">
          <li v-for="(row, i) in snapshot.recentFollows" :key="i">
            <span>{{ label(row.follower) }} → {{ label(row.followee) }}</span>
            <span>{{ when(row.createdAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="nq-card block">
        <h2>People</h2>
        <p v-if="!snapshot.people.length" class="empty">No Handles yet.</p>
        <ul v-else class="rows rows--people">
          <li v-for="row in snapshot.people" :key="row.walletAddress">
            <span>
              {{ label(row) }}
              · {{ row.favoriteCount }} fav
              · {{ row.followerCount }} followers
            </span>
            <span>{{ formatActiveMs(row.activeMs7d) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import LoadingWait from "@/components/LoadingWait.vue";
import { formatActiveMs, studioEntryVisible } from "@/lib/studio";
import { displayName, type StudioPersonRef, type StudioSnapshot } from "@cinima/shared";

const router = useRouter();
const auth = useAuthStore();
const { request } = useApi();

const loading = ref(true);
const snapshot = ref<StudioSnapshot | null>(null);

function label(row: StudioPersonRef): string {
  return displayName(row.handle, row.walletAddress);
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const signupDays = ref<{ date: string; count: number }[]>([]);

onMounted(async () => {
  if (!studioEntryVisible(auth.user?.walletAddress)) {
    await router.replace({ name: "me" });
    return;
  }
  try {
    snapshot.value = await request<StudioSnapshot>("/studio");
    signupDays.value = (snapshot.value.signupsByDay || []).filter((d) => d.count > 0);
  } catch {
    await router.replace({ name: "me" });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.studio {
  min-height: 100%;
  padding-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h1 {
  margin: 0;
  font-size: 1.35rem;
}

.lede {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.85rem 1rem;
}

.stat strong {
  font-size: 1.25rem;
}

.stat span {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.block {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.block h2 {
  margin: 0;
  font-size: 1rem;
}

.empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rows li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.rows li span:last-child {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.rows--people li span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
