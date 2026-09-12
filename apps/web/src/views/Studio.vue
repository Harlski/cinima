<template>
  <div class="studio">
    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>

    <div v-else-if="loadError" class="content">
      <h1>Studio</h1>
      <p class="lede">{{ loadError }}</p>
      <p v-if="loadDetail" class="detail">{{ loadDetail }}</p>
      <button type="button" class="nq-pill-blue nq-pill-stretch" @click="loadStudio">
        Retry
      </button>
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
          <strong>{{ snapshot.totals.visitsToday }}</strong>
          <span>Share visits today</span>
        </div>
        <div class="stat nq-card">
          <strong>{{ snapshot.totals.visits }}</strong>
          <span>Share visits</span>
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
            <span class="row-main">
              <RouterLink
                v-if="profileTo(row.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.walletAddress } }"
              >{{ label(row) }}</RouterLink>
              <span v-else>{{ label(row) }}</span>
            </span>
            <span class="row-meta">{{ when(row.createdAt) }}</span>
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
            <span class="row-main">
              <RouterLink
                v-if="profileTo(row.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.walletAddress } }"
              >{{ label(row) }}</RouterLink>
              <span v-else>{{ label(row) }}</span>
              · {{ row.query }}
            </span>
            <span class="row-meta">{{ when(row.createdAt) }}</span>
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
            <span class="row-main">
              <RouterLink
                v-if="profileTo(row.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.walletAddress } }"
              >{{ label(row) }}</RouterLink>
              <span v-else>{{ label(row) }}</span>
              · {{ row.title || row.titleId }}
            </span>
            <span class="row-meta">{{ when(row.createdAt) }}</span>
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
            <span class="row-main">
              <RouterLink
                v-if="profileTo(row.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.walletAddress } }"
              >{{ label(row) }}</RouterLink>
              <span v-else>{{ label(row) }}</span>
              · {{ row.kind === "profile" ? "profile" : row.kind === "watchlist" ? "watchlist" : row.title || "title" }}
            </span>
            <span class="row-meta">{{ formatShareVisitCounts(row) }}</span>
          </li>
        </ul>
      </section>

      <section class="nq-card block">
        <h2>Follows</h2>
        <p v-if="!snapshot.recentFollows.length" class="empty">No follows yet.</p>
        <ul v-else class="rows rows--people">
          <li v-for="(row, i) in snapshot.recentFollows" :key="i">
            <span class="row-main">
              <RouterLink
                v-if="profileTo(row.follower.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.follower.walletAddress } }"
              >{{ label(row.follower) }}</RouterLink>
              <span v-else>{{ label(row.follower) }}</span>
              →
              <RouterLink
                v-if="profileTo(row.followee.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.followee.walletAddress } }"
              >{{ label(row.followee) }}</RouterLink>
              <span v-else>{{ label(row.followee) }}</span>
            </span>
            <span class="row-meta">{{ when(row.createdAt) }}</span>
          </li>
        </ul>
      </section>

      <section class="nq-card block">
        <h2>Sends</h2>
        <p class="lede sender-balance">
          Sender wallet
          <strong v-if="snapshot.sender.balanceLuna != null">
            {{ (snapshot.sender.balanceLuna / LUNA_PER_NIM).toFixed(4) }} NIM
          </strong>
          <span v-else>balance unknown</span>
          · {{ snapshot.sender.configured ? "configured" : "unconfigured" }}
        </p>
        <form class="ping-form" @submit.prevent="sendPing">
          <label>
            Handle
            <div class="handle-picker">
              <ul v-if="pingSelected.length" class="handle-chips">
                <li v-for="person in pingSelected" :key="person.walletAddress" class="handle-chip">
                  <Identicon :address="person.walletAddress" :size="28" :alt="person.handle || ''" />
                  <span>{{ person.handle || label(person) }}</span>
                  <button
                    type="button"
                    class="handle-chip-remove"
                    :aria-label="`Remove ${person.handle || 'Handle'}`"
                    @click="removePingHandle(person.walletAddress)"
                  >
                    ×
                  </button>
                </li>
              </ul>
              <input
                v-model="pingQuery"
                class="nq-input"
                autocomplete="off"
                aria-autocomplete="list"
                :aria-expanded="pingSuggestions.length > 0"
                placeholder="Type a Handle"
                @keydown.enter.prevent="pickFirstPingSuggestion"
                @keydown.escape="pingSuggestions = []"
              />
              <ul
                v-if="pingSuggestions.length || showEveryoneCommand"
                class="handle-suggest"
                role="listbox"
              >
                <li v-if="showEveryoneCommand" role="option">
                  <button type="button" class="handle-suggest-btn" @click="pingEveryone">
                    Everyone
                  </button>
                </li>
                <li v-for="person in pingSuggestions" :key="person.walletAddress" role="option">
                  <button type="button" class="handle-suggest-btn" @click="selectPingHandle(person)">
                    <Identicon :address="person.walletAddress" :size="32" :alt="person.handle || ''" />
                    <span>{{ person.handle }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </label>
          <label>
            Message
            <input v-model="pingMessage" class="nq-input" autocomplete="off" />
          </label>
          <div class="ping-actions">
            <button
              type="submit"
              class="nq-pill-blue"
              :disabled="pingBusy !== null || pingSelected.length === 0 || !pingMessage.trim()"
              :aria-busy="pingBusy === 'send'"
            >
              {{ acceptedWaitLabel("Send", pingBusy === "send") }}
            </button>
            <button
              type="button"
              class="nq-pill-blue"
              :disabled="pingBusy !== null || !pingMessage.trim()"
              :aria-busy="pingBusy === 'everyone'"
              @click="pingEveryone"
            >
              {{ acceptedWaitLabel("Everyone", pingBusy === "everyone") }}
            </button>
            <button
              type="button"
              class="nq-pill-blue"
              :disabled="pingBusy !== null"
              :aria-busy="pingBusy === 'self'"
              @click="pingMe"
            >
              {{ acceptedWaitLabel("Ping me", pingBusy === "self") }}
            </button>
          </div>
          <p v-if="pingError" class="empty">{{ pingError }}</p>
          <p v-else-if="pingMemo" class="empty">Queued: {{ pingMemo }}</p>
        </form>
        <ul v-if="snapshot.recentSends.length" class="rows rows--people">
          <li v-for="row in snapshot.recentSends" :key="row.id">
            <span class="row-main">
              {{ row.source }} · {{ row.toHandle || row.toWallet.slice(0, 8) }}
              · {{ row.memo }}
            </span>
            <span class="row-meta">{{ row.status }}</span>
          </li>
        </ul>
        <p v-else class="empty">No Sends yet.</p>
      </section>

      <section class="nq-card block">
        <h2>People</h2>
        <p v-if="!snapshot.people.length" class="empty">No Handles yet.</p>
        <ul v-else class="rows rows--people">
          <li v-for="row in snapshot.people" :key="row.walletAddress">
            <span class="row-main">
              <RouterLink
                v-if="profileTo(row.walletAddress)"
                class="handle-link"
                :to="{ name: 'user', params: { wallet: row.walletAddress } }"
              >{{ label(row) }}</RouterLink>
              <span v-else>{{ label(row) }}</span>
              · {{ row.favoriteCount }} fav
              · {{ row.followerCount }} followers
              <template v-if="row.quiet"> · Quiet</template>
            </span>
            <span class="row-meta">{{ formatActiveMs(row.activeMs7d) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import Identicon from "@/components/Identicon.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import {
  creatorEveryonePingBody,
  creatorPingBody,
  decideStudioOpen,
  everyoneCommandVisible,
  formatActiveMs,
  formatShareVisitCounts,
  studioProfileLocation,
  suggestPingHandles,
} from "@/lib/studio";
import {
  displayName,
  LUNA_PER_NIM,
  type PingHandleMatch,
  type StudioPersonRef,
  type StudioSnapshot,
} from "@cinima/shared";

const router = useRouter();
const auth = useAuthStore();
const { request } = useApi();

const loading = ref(true);
const snapshot = ref<StudioSnapshot | null>(null);
const loadError = ref<string | null>(null);
const loadDetail = ref<string | null>(null);
const pingQuery = ref("");
const pingSelected = ref<PingHandleMatch[]>([]);
const pingSuggestions = ref<PingHandleMatch[]>([]);
const pingMessage = ref("");
const pingBusy = ref<"send" | "self" | "everyone" | null>(null);
const pingError = ref<string | null>(null);
const pingMemo = ref<string | null>(null);
let pingSuggestTimer: ReturnType<typeof setTimeout> | null = null;

function label(row: StudioPersonRef): string {
  return displayName(row.handle, row.walletAddress);
}

function profileTo(wallet: string) {
  return studioProfileLocation(wallet);
}

const showEveryoneCommand = computed(() => everyoneCommandVisible(pingQuery.value));

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const signupDays = ref<{ date: string; count: number }[]>([]);

async function loadStudio() {
  const gate = decideStudioOpen({ wallet: auth.user?.walletAddress });
  if (gate.kind === "redirect-me") {
    await router.replace({ name: "me" });
    return;
  }
  const showWait = !snapshot.value;
  if (showWait) loading.value = true;
  loadError.value = null;
  loadDetail.value = null;
  try {
    snapshot.value = await request<StudioSnapshot>("/studio");
    signupDays.value = (snapshot.value.signupsByDay || []).filter((d) => d.count > 0);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Studio is unavailable.";
    const failed = decideStudioOpen({
      wallet: auth.user?.walletAddress,
      fetchError: message,
    });
    if (failed.kind === "redirect-me") {
      await router.replace({ name: "me" });
      return;
    }
    loadError.value = "Could not load Studio. Try again in a moment.";
    loadDetail.value = message;
    snapshot.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadStudio();
});

watch(pingQuery, (query) => {
  const selected = pingSelected.value.map((p) => p.walletAddress);
  pingSuggestions.value = suggestPingHandles(snapshot.value?.people ?? [], query, selected).filter(
    (p): p is PingHandleMatch => !!p.handle
  );
  if (pingSuggestTimer) clearTimeout(pingSuggestTimer);
  const q = query.trim();
  if (!q) {
    pingSuggestions.value = [];
    return;
  }
  pingSuggestTimer = setTimeout(() => {
    void fetchPingHandles(q);
  }, 150);
});

async function fetchPingHandles(query: string) {
  try {
    const data = await request<{ handles: PingHandleMatch[] }>(
      `/sends/handles?q=${encodeURIComponent(query)}`
    );
    if (pingQuery.value.trim() !== query) return;
    const selected = new Set(pingSelected.value.map((p) => p.walletAddress));
    pingSuggestions.value = data.handles.filter((p) => !selected.has(p.walletAddress));
  } catch {
    /* keep local suggestions */
  }
}

function selectPingHandle(person: PingHandleMatch) {
  if (pingSelected.value.some((p) => p.walletAddress === person.walletAddress)) return;
  pingSelected.value = [...pingSelected.value, person];
  pingQuery.value = "";
  pingSuggestions.value = [];
}

function removePingHandle(wallet: string) {
  pingSelected.value = pingSelected.value.filter((p) => p.walletAddress !== wallet);
}

function pickFirstPingSuggestion() {
  if (showEveryoneCommand.value) {
    void pingEveryone();
    return;
  }
  const first = pingSuggestions.value[0];
  if (first) {
    selectPingHandle(first);
    return;
  }
  if (pingSelected.value.length && pingMessage.value.trim()) {
    void sendPing();
  }
}

async function sendPing() {
  pingBusy.value = "send";
  pingError.value = null;
  pingMemo.value = null;
  try {
    const result = await request<{ queued: boolean; memo: string }>("/sends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creatorPingBody(pingSelected.value, pingMessage.value.trim())),
    });
    pingMemo.value = result.memo;
    pingMessage.value = "";
    pingSelected.value = [];
    await loadStudio();
  } catch (err) {
    pingError.value = err instanceof Error ? err.message : "Could not queue Ping.";
  } finally {
    pingBusy.value = null;
  }
}

async function pingEveryone() {
  const message = pingMessage.value.trim();
  if (!message) {
    pingError.value = "Add a message to Ping Everyone.";
    return;
  }
  pingBusy.value = "everyone";
  pingError.value = null;
  pingMemo.value = null;
  try {
    const result = await request<{ queued: boolean; queuedCount?: number; memo: string }>("/sends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creatorEveryonePingBody(message)),
    });
    pingMemo.value =
      result.queuedCount != null ? `Queued ${result.queuedCount}: ${result.memo}` : result.memo;
    pingMessage.value = "";
    pingQuery.value = "";
    pingSelected.value = [];
    pingSuggestions.value = [];
    await loadStudio();
  } catch (err) {
    pingError.value = err instanceof Error ? err.message : "Could not queue Ping.";
  } finally {
    pingBusy.value = null;
  }
}

async function pingMe() {
  pingBusy.value = "self";
  pingError.value = null;
  pingMemo.value = null;
  try {
    const result = await request<{ queued: boolean; memo: string }>("/sends/self", {
      method: "POST",
    });
    pingMemo.value = result.memo;
    await loadStudio();
  } catch (err) {
    pingError.value = err instanceof Error ? err.message : "Could not queue Ping.";
  } finally {
    pingBusy.value = null;
  }
}
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

.detail {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
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

.row-meta {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.row-main {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.handle-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.handle-link:hover {
  text-decoration: underline;
}

.sender-balance {
  font-size: 0.9rem;
}

.ping-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ping-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.handle-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.handle-chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.handle-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.4rem 0.2rem 0.25rem;
  border-radius: 999px;
  border: 1px solid var(--border, #ccc);
  background: var(--surface, #fff);
  color: inherit;
  font-size: 0.85rem;
}

.handle-chip :deep(.identicon) {
  flex-shrink: 0;
}

.handle-chip-remove {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0 0.15rem;
}

.handle-suggest {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  position: absolute;
  z-index: 4;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border, #ccc);
  background: var(--surface, #fff);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.handle-suggest-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  padding: 0.35rem 0.4rem;
  border-radius: 0.3rem;
  cursor: pointer;
}

.handle-suggest-btn:hover,
.handle-suggest-btn:focus-visible {
  background: var(--bg-secondary, #f3f4f6);
}

.ping-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.nq-input {
  font: inherit;
  padding: 0.45rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border, #ccc);
  background: var(--surface, #fff);
  color: inherit;
}
</style>
