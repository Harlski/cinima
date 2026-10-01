<template>
  <header
    class="app-brand"
    :class="{ 'app-brand--fixed': fixed }"
  >
    <div ref="inner" class="app-brand-inner">
      <component
        :is="linkToLanding ? 'RouterLink' : 'div'"
        ref="brandHome"
        class="brand-home"
        v-bind="linkToLanding ? { to: '/', 'aria-label': 'Cinima Landing' } : {}"
        :style="{ '--brand-shift': `${shift}px` }"
        @pointerdown="onBrandPointerDown"
        @pointermove="onBrandPointerMove"
        @pointerup="onBrandPointerUp"
        @pointercancel="onBrandPointerUp"
        @click.capture="onBrandClick"
      >
        <span class="brand-mark" aria-hidden="true">
          <NqIcon name="logos-nimiq-hexagon-outline-mono" :size="20" class="brand-mark-icon" />
        </span>
        <BrandWordmark size="sm" animate />
      </component>
      <RouterLink
        v-if="showCueLab"
        class="cue-lab-entry"
        :to="{ name: 'cue-lab' }"
      >
        Cues
      </RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import type { AchievementKind } from "@cinima/shared";
import BrandWordmark from "@/components/BrandWordmark.vue";
import NqIcon from "@/components/NqIcon.vue";
import { useApi } from "@/composables/useApi";
import {
  brandHeaderMoveCommitted,
  brandHeaderMovePending,
  brandHeaderShiftAfterDrag,
  clampBrandHeaderShift,
  clearBrandHeaderMovePending,
  loadBrandHeaderShift,
  noteBrandHeaderMove,
  saveBrandHeaderShift,
} from "@/lib/brandHeaderShift";
import { cueLabEntryVisible } from "@/lib/cueLab";
import { toggleForYouDebug } from "@/lib/forYouDebug";
import { useAuthStore } from "@/stores/auth";
import { useMarqueeStore } from "@/stores/marquee";

const props = withDefaults(
  defineProps<{
    fixed?: boolean;
    /** When true, wordmark navigates to Landing (`/`). */
    linkToLanding?: boolean;
    /** Signed-in shell: show the DEV Cue lab entry. */
    cueLab?: boolean;
  }>(),
  {
    fixed: false,
    linkToLanding: false,
    cueLab: false,
  }
);

const showCueLab = computed(() => cueLabEntryVisible({ inAppShell: props.cueLab }));
const { request } = useApi();
const auth = useAuthStore();

const DRAG_START_PX = 8;
const shift = ref(0);
const movable = ref(false);
const inner = ref<HTMLElement | null>(null);
const brandHome = ref<HTMLElement | { $el?: HTMLElement } | null>(null);

const LONG_PRESS_MS = 650;
let pressTimer: ReturnType<typeof setTimeout> | undefined;
let longPress = false;
let taps = 0;
let tapReset: ReturnType<typeof setTimeout> | undefined;
let dragPointer: number | null = null;
let dragStartX = 0;
let dragStartShift = 0;
let dragging = false;
let suppressClick = false;
let fullscreenObserver: MutationObserver | undefined;

function brandElement(): HTMLElement | null {
  const node = brandHome.value;
  if (!node) return null;
  if (node instanceof HTMLElement) return node;
  return node.$el instanceof HTMLElement ? node.$el : null;
}

function inPayFullscreen(): boolean {
  return document.documentElement.classList.contains("pay-fullscreen");
}

function maxShift(): number {
  const bar = inner.value;
  const home = brandElement();
  if (!bar || !home) return 0;
  const style = getComputedStyle(bar);
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  const padRight = Number.parseFloat(style.paddingRight) || 0;
  return Math.max(0, bar.clientWidth - padLeft - padRight - home.offsetWidth);
}

function applyShift(px: number) {
  shift.value = clampBrandHeaderShift(px, maxShift());
}

function restoreShift() {
  movable.value = inPayFullscreen();
  if (!movable.value) return;
  applyShift(loadBrandHeaderShift());
}

onMounted(() => {
  restoreShift();
  void reportWordmarkMove();
  requestAnimationFrame(() => restoreShift());
  fullscreenObserver = new MutationObserver(() => restoreShift());
  fullscreenObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("resize", restoreShift);
});

onUnmounted(() => {
  fullscreenObserver?.disconnect();
  window.removeEventListener("resize", restoreShift);
  if (pressTimer) window.clearTimeout(pressTimer);
  if (tapReset) window.clearTimeout(tapReset);
});

function onBrandPointerDown(event: PointerEvent) {
  longPress = false;
  dragging = false;
  pressTimer = window.setTimeout(() => {
    longPress = true;
    toggleForYouDebug();
  }, LONG_PRESS_MS);
  if (!inPayFullscreen()) return;
  dragPointer = event.pointerId;
  dragStartX = event.clientX;
  dragStartShift = shift.value;
  const target = event.currentTarget as HTMLElement;
  try {
    target.setPointerCapture?.(event.pointerId);
  } catch {
    /* Pointer capture needs a real contact. The drag still tracks pointermove. */
  }
}

function onBrandPointerMove(event: PointerEvent) {
  if (dragPointer !== event.pointerId || !inPayFullscreen()) return;
  const delta = event.clientX - dragStartX;
  if (!dragging && Math.abs(delta) < DRAG_START_PX) return;
  dragging = true;
  if (pressTimer) window.clearTimeout(pressTimer);
  pressTimer = undefined;
  longPress = false;
  applyShift(brandHeaderShiftAfterDrag(dragStartShift, delta, maxShift()));
}

function onBrandPointerUp(event?: PointerEvent) {
  if (pressTimer) window.clearTimeout(pressTimer);
  pressTimer = undefined;
  if (event && dragPointer === event.pointerId && dragging) {
    const endShift = shift.value;
    if (brandHeaderMoveCommitted(dragStartShift, endShift)) {
      noteBrandHeaderMove();
      void reportWordmarkMove();
    }
    saveBrandHeaderShift(endShift);
    suppressClick = true;
  }
  dragging = false;
  dragPointer = null;
}

async function reportWordmarkMove() {
  if (!brandHeaderMovePending() || !auth.token) return;
  try {
    const data = await request<{ earnedAchievements?: AchievementKind[] }>(
      "/usage/brand-header-move",
      { method: "POST" }
    );
    clearBrandHeaderMovePending();
    if (data.earnedAchievements?.length) {
      useMarqueeStore().enqueue(data.earnedAchievements);
    }
  } catch {
    /* The wordmark already moved. The next signed-in open can award Cameras watching. */
  }
}

watch(
  () => auth.token,
  () => {
    void reportWordmarkMove();
  }
);

function onBrandClick(event: MouseEvent) {
  if (suppressClick) {
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
    taps = 0;
    return;
  }
  if (longPress) {
    event.preventDefault();
    event.stopPropagation();
    longPress = false;
    taps = 0;
    return;
  }
  taps += 1;
  if (tapReset) window.clearTimeout(tapReset);
  tapReset = window.setTimeout(() => {
    taps = 0;
  }, 2000);
  if (taps >= 5) {
    event.preventDefault();
    event.stopPropagation();
    taps = 0;
    toggleForYouDebug();
  }
}
</script>

<style scoped>
.app-brand-inner {
  position: relative;
}

.brand-home {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: inherit;
  text-decoration: none;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

a.brand-home {
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
}

.cue-lab-entry {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.cue-lab-entry.router-link-active {
  color: var(--text-primary);
}
</style>
