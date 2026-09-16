<template>
  <div
    v-if="enabled"
    class="fy-debug"
    :class="{ 'fy-debug--open': open }"
    data-fy-debug
  >
    <div class="fy-debug-bar">
      <button type="button" class="fy-debug-toggle" @click="open = !open">
        For You debug {{ open ? "hide" : "show" }}
      </button>
      <button type="button" class="fy-debug-action" @click="refresh">Snap</button>
      <button type="button" class="fy-debug-action" @click="shareDump">Share</button>
      <button type="button" class="fy-debug-action" @click="copyDump">
        {{ copied ? "Copied" : "Copy" }}
      </button>
      <button type="button" class="fy-debug-action" @click="off">Off</button>
    </div>
    <pre v-if="open" class="fy-debug-body">{{ text }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { copyShareLink } from "@/lib/shareLinkCopy";
import {
  captureForYouDebugSnapshot,
  formatForYouDebugDump,
  forYouDebugLog,
  isForYouDebugEnabled,
  setForYouDebugEnabled,
  subscribeForYouDebug,
  syncForYouDebugFromQuery,
  type ForYouDebugDump,
} from "@/lib/forYouDebug";
import { isNimiqPay, isNimiqPayUserAgent } from "@/lib/nimiqPay";
import { useForYouMotionStore } from "@/stores/forYouMotion";

const route = useRoute();
const motion = useForYouMotionStore();
const enabled = ref(false);
const open = ref(true);
const copied = ref(false);
const dump = ref<ForYouDebugDump | null>(null);

const text = computed(() =>
  dump.value ? formatForYouDebugDump(dump.value) : "…"
);

function refreshEnabled() {
  enabled.value = syncForYouDebugFromQuery(route.query);
}

function onDebugChanged() {
  enabled.value = isForYouDebugEnabled();
  if (enabled.value) refresh();
}

function refresh() {
  dump.value = captureForYouDebugSnapshot({
    href: typeof window !== "undefined" ? window.location.href : route.fullPath,
    inPay: isNimiqPay() || isNimiqPayUserAgent(),
    motion: {
      pending: [...motion.pendingRefillSlots],
      fizzles: motion.fizzles.length,
      refills: motion.refills.length,
    },
  });
}

function off() {
  setForYouDebugEnabled(false);
  enabled.value = false;
}

async function copyDump() {
  refresh();
  const ok = await copyShareLink(text.value);
  copied.value = ok;
  window.setTimeout(() => {
    copied.value = false;
  }, 1600);
}

async function shareDump() {
  refresh();
  const payload = text.value;
  const share = navigator.share?.bind(navigator);
  if (share) {
    try {
      await share({ title: "For You debug", text: payload });
      return;
    } catch {
      /* fall through to copy */
    }
  }
  await copyDump();
}

let timer: ReturnType<typeof setInterval> | undefined;
let unsub: (() => void) | undefined;

watch(
  () => route.query.debug,
  () => {
    refreshEnabled();
    if (enabled.value) refresh();
  }
);

function hookPageErrors() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    forYouDebugLog(`error ${event.message}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    forYouDebugLog(`reject ${String(event.reason)}`);
  });
}

onMounted(() => {
  hookPageErrors();
  refreshEnabled();
  if (enabled.value) refresh();
  unsub = subscribeForYouDebug(onDebugChanged);
  timer = window.setInterval(() => {
    if (enabled.value && open.value) refresh();
  }, 700);
});

onUnmounted(() => {
  unsub?.();
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped>
.fy-debug {
  position: fixed;
  top: calc(var(--vv-offset-top, 0px) + var(--app-brand-row, 2.75rem) + 0.2rem);
  left: 0.4rem;
  right: 0.4rem;
  z-index: 240;
  max-height: 46vh;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  line-height: 1.35;
  color: #f6e7b2;
  background: rgba(8, 8, 12, 0.88);
  border: 1px solid color-mix(in oklch, var(--gold, #c8a24a) 55%, transparent);
  border-radius: 8px;
  overflow: hidden;
}

.fy-debug-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.28rem 0.32rem;
}

.fy-debug-toggle,
.fy-debug-action {
  border: 0;
  border-radius: 4px;
  padding: 0.22rem 0.4rem;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #1a1408;
  background: var(--gold, #c8a24a);
  cursor: pointer;
}

.fy-debug-action {
  background: #2a2430;
  color: #f6e7b2;
}

.fy-debug-body {
  margin: 0;
  padding: 0.35rem 0.45rem 0.55rem;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
