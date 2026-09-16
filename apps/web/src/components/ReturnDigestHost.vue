<template>
  <Teleport to="body">
    <div
      v-if="digest"
      class="digest-modal"
      data-scroll-trap
      :class="{
        'digest-modal--static': reduceMotion,
        'digest-modal--departing': departing,
      }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="digest-title"
      @click.self="closePeek"
    >
      <div class="digest-panel nq-card" @click="closePeek">
        <p id="digest-title" class="digest-kicker">Since you were away</p>
        <div ref="facesRoot" class="digest-faces" :style="{ '--n': digest.thankers.length }">
          <div
            v-for="(person, i) in digest.thankers"
            :key="person.walletAddress"
            class="digest-face"
            :class="{ 'digest-face--peek': isPeekOpen(person.walletAddress) }"
            :style="{ '--i': i }"
          >
            <button
              type="button"
              class="digest-face-btn"
              :aria-label="peekFor(person).handle"
              :aria-expanded="isPeekOpen(person.walletAddress)"
              :aria-describedby="
                isPeekOpen(person.walletAddress) ? peekDomId(person.walletAddress) : undefined
              "
              :disabled="departing"
              @click.stop="onPeek(person.walletAddress)"
            >
              <Identicon :address="person.walletAddress" :size="56" alt="" plain />
            </button>
            <span
              v-if="cheerAt(i) && !isPeekOpen(person.walletAddress)"
              class="digest-cheer"
              aria-hidden="true"
            >{{ cheerAt(i) }}</span>
            <div
              v-if="isPeekOpen(person.walletAddress)"
              :id="peekDomId(person.walletAddress)"
              ref="peekEl"
              class="digest-peek"
              role="tooltip"
              :style="{ '--peek-shift': `${peekShift}px` }"
              @click.stop
            >
              <p class="digest-peek-handle">{{ peekFor(person).handle }}</p>
              <p
                v-for="(row, ri) in peekFor(person).rows"
                :key="person.titles[ri]?.titleId ?? ri"
                class="digest-peek-row"
              >
                <span class="digest-peek-title">{{ row.titleName }}</span>
                <span v-if="row.nimLabel" class="digest-peek-nim">{{ row.nimLabel }}</span>
              </p>
            </div>
          </div>
        </div>
        <p v-if="nimLine" class="digest-nim">{{ nimLine }}</p>
        <p class="digest-thanks">
          {{ thanksLine }}
        </p>
        <button
          type="button"
          class="nq-pill-blue nq-pill-lg digest-continue"
          :disabled="departing"
          :aria-busy="departing"
          @click="onContinue"
        >
          Continue
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  digestNimReceivedLabel,
  digestThankerPeek,
  nextDigestPeek,
  type DigestThanker,
} from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import { digestContinueGoesToDiscover } from "@/lib/cueLab";
import {
  DIGEST_FLY_MS,
  DIGEST_FLY_STAGGER_MS,
  DIGEST_ME_HINT_AT_MS,
  digestFaceFly,
  digestFlySettleMs,
  digestPeekShift,
} from "@/lib/returnDigestFly";
import { useReturnDigestStore } from "@/stores/returnDigest";

const router = useRouter();
const store = useReturnDigestStore();
const { digest } = storeToRefs(store);
const facesRoot = ref<HTMLElement | null>(null);
const departing = ref(false);
const peekWallet = ref<string | null>(null);
const peekShift = ref(0);
const peekEl = ref<HTMLElement | null>(null);
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

const reduceMotion = computed(
  () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

const nimLine = computed(() => digestNimReceivedLabel(digest.value?.nimReceived ?? 0));

const thanksLine = computed(() => {
  const n = digest.value?.thanksCount ?? 0;
  if (n === 1) return "1 Thanks received";
  return `${n} Thanks received`;
});

function cheerAt(index: number): string | null {
  const n = digest.value?.thankers.length ?? 0;
  if (n === 0 || reduceMotion.value || departing.value) return null;
  const picks = n === 1 ? [0] : [0, Math.min(n - 1, 2)];
  if (!picks.includes(index)) return null;
  return index === picks[0] ? "👏" : "🎉";
}

function peekFor(person: DigestThanker) {
  return digestThankerPeek(person);
}

function isPeekOpen(walletAddress: string) {
  return !departing.value && peekWallet.value === walletAddress;
}

function peekDomId(walletAddress: string) {
  return `digest-peek-${walletAddress}`;
}

function closePeek() {
  peekWallet.value = null;
  peekShift.value = 0;
}

function onPeek(walletAddress: string) {
  if (departing.value) return;
  peekWallet.value = nextDigestPeek(peekWallet.value, walletAddress);
  peekShift.value = 0;
}

async function layoutPeek() {
  if (!peekWallet.value || departing.value) {
    peekShift.value = 0;
    return;
  }
  peekShift.value = 0;
  await nextTick();
  const el = peekEl.value;
  if (!el) return;
  peekShift.value = digestPeekShift(el.getBoundingClientRect(), window.innerWidth);
}

watch(digest, () => {
  peekWallet.value = null;
  peekShift.value = 0;
});

watch(peekWallet, () => {
  void layoutPeek();
});

function meTabBox(): DOMRect | null {
  const tab = document.querySelector("[data-digest-target=me]");
  const icon = tab?.querySelector(".tab-identicon");
  const el = icon ?? tab;
  return el instanceof Element ? el.getBoundingClientRect() : null;
}

function clearTimers() {
  if (settleTimer != null) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
  if (hintTimer != null) {
    window.clearTimeout(hintTimer);
    hintTimer = null;
  }
}

function finish() {
  clearTimers();
  departing.value = false;
  const goDiscover = digestContinueGoesToDiscover(router.currentRoute.value.name);
  store.dismiss();
  if (!goDiscover) return;
  void router.replace({ name: "discover" });
}

function flyFacesToMe(): boolean {
  const to = meTabBox();
  const nodes = facesRoot.value?.querySelectorAll<HTMLElement>(".digest-face");
  if (!to || !nodes?.length) return false;
  nodes.forEach((el, i) => {
    el.style.animation = "none";
    void el.offsetWidth;
    const { dx, dy, scale } = digestFaceFly(el.getBoundingClientRect(), to);
    el.style.zIndex = String(8 + i);
    el.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
      ],
      {
        duration: DIGEST_FLY_MS,
        delay: i * DIGEST_FLY_STAGGER_MS,
        easing: "cubic-bezier(0.4, 0, 0.15, 1)",
        fill: "forwards",
      }
    );
  });
  return true;
}

function onContinue() {
  if (departing.value) return;
  peekWallet.value = null;
  if (reduceMotion.value || !flyFacesToMe()) {
    finish();
    return;
  }
  departing.value = true;
  hintTimer = window.setTimeout(() => store.flashMeTab(), DIGEST_ME_HINT_AT_MS);
  settleTimer = window.setTimeout(
    finish,
    digestFlySettleMs(digest.value?.thankers.length ?? 0) + 40
  );
}

onUnmounted(clearTimers);
</script>

<style scoped>
.digest-modal {
  position: fixed;
  inset: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: transparent;
}

.digest-panel {
  width: min(100%, 22rem);
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.2rem 1.3rem;
  text-align: center;
}

.digest-kicker {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.digest-faces {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
  min-height: 4rem;
}

.digest-face {
  position: relative;
  animation:
    digest-pop 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.2) both,
    digest-bounce 1.1s ease-in-out 0.5s 3;
  animation-delay: calc(var(--i) * 80ms), calc(0.45s + var(--i) * 80ms);
}

.digest-face--peek {
  z-index: 12;
  animation-play-state: paused;
}

.digest-face-btn {
  appearance: none;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.digest-face-btn:disabled {
  cursor: default;
}

.digest-face :deep(.identicon) {
  display: block;
}

.digest-cheer {
  position: absolute;
  top: -0.55rem;
  right: -0.35rem;
  font-size: 0.95rem;
  pointer-events: none;
  animation: digest-cheer 0.9s ease-in-out 0.7s 3;
}

.digest-peek {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.4rem);
  z-index: 4;
  width: max-content;
  max-width: min(16.5rem, calc(100vw - 1.5rem));
  transform: translateX(calc(-50% + var(--peek-shift, 0px)));
  padding: 0.5rem 0.65rem;
  border-radius: 0.55rem;
  border: 1px solid var(--border);
  background: var(--colors-neutral-50);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  box-shadow: 0 10px 24px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.digest-peek::before {
  content: "";
  position: absolute;
  top: 100%;
  left: calc(50% - var(--peek-shift, 0px));
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--border);
}

.digest-peek::after {
  content: "";
  position: absolute;
  top: 100%;
  left: calc(50% - var(--peek-shift, 0px));
  transform: translateX(-50%) translateY(-1px);
  border: 6px solid transparent;
  border-top-color: var(--colors-neutral-50);
}

.digest-peek-handle {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 700;
}

.digest-peek-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.85rem;
  margin: 0;
}

.digest-peek-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.digest-peek-nim {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--gold, #e5c158);
  white-space: nowrap;
}

.digest-nim {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--gold, #e5c158);
  animation: digest-fade 0.4s ease both;
  animation-delay: calc(0.35s + var(--n, 1) * 80ms);
}

.digest-thanks {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.digest-continue {
  min-width: 8.5rem;
  animation: digest-fade 0.35s ease both;
  animation-delay: calc(0.55s + var(--n, 1) * 80ms);
}

.digest-modal--departing {
  pointer-events: none;
  background: transparent;
  transition: background 0.28s ease;
}

.digest-modal--departing .digest-panel {
  background: transparent;
  box-shadow: none;
  border-color: transparent;
}

.digest-modal--departing .digest-kicker,
.digest-modal--departing .digest-nim,
.digest-modal--departing .digest-thanks,
.digest-modal--departing .digest-continue,
.digest-modal--departing .digest-cheer,
.digest-modal--departing .digest-peek {
  animation: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.digest-modal--departing .digest-face {
  animation: none;
}

.digest-modal--static .digest-face,
.digest-modal--static .digest-cheer,
.digest-modal--static .digest-nim,
.digest-modal--static .digest-continue {
  animation: none;
}

@keyframes digest-pop {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes digest-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

@keyframes digest-cheer {
  0%,
  100% {
    transform: translateY(0) rotate(-8deg);
  }
  50% {
    transform: translateY(-4px) rotate(8deg);
  }
}

@keyframes digest-fade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .digest-face,
  .digest-cheer,
  .digest-nim,
  .digest-continue {
    animation: none;
  }
}
</style>
