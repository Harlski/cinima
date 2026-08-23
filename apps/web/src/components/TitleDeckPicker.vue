<template>
  <div class="picker" :style="pickerStyle">
    <div v-if="selected" class="detail">
      <button
        type="button"
        class="hero poster-press"
        :aria-label="`Open ${selected.title.title}`"
        @click="openSelected"
      >
        <PosterImg
          v-if="selected.title.posterUrl"
          :src="selected.title.posterUrl"
          :alt="selected.title.title"
        />
        <div v-else class="hero-fallback">{{ selected.title.title }}</div>
      </button>

      <div class="meta">
        <h2>{{ selected.title.title }}</h2>
        <p class="meta-line">
          <span v-if="selected.title.year">{{ selected.title.year }}</span>
          <span v-if="selected.title.year" class="dot">·</span>
          <span>{{ mediaLabel(selected.title) }}</span>
          <template v-if="selected.title.rating != null">
            <span class="dot">·</span>
            <span class="rating">{{ selected.title.rating.toFixed(1) }}</span>
          </template>
        </p>
        <p v-if="selected.title.overview" class="overview">
          {{ selected.title.overview }}
        </p>
        <div v-if="showSocial && selected.sampleWallets?.length" class="favorites">
          <NqIcon name="heart" :size="16" class="favorites-ico" />
          <div class="favorite-faces">
            <Identicon
              v-for="wallet in selected.sampleWallets.slice(0, 3)"
              :key="wallet"
              class="favorite-face"
              :address="wallet"
              :size="22"
              alt=""
            />
          </div>
        </div>
        <div class="actions">
          <span v-if="actionsPrefix" class="actions-prefix">{{ actionsPrefix }}</span>
          <button
            v-if="primaryActionLabel"
            type="button"
            class="nq-pill-stretch"
            :class="primaryActionActive ? 'nq-pill-blue' : 'nq-pill-secondary'"
            @click="onPrimaryAction"
          >
            {{ primaryActionLabel }}
          </button>
          <button
            v-if="secondaryActionLabel"
            type="button"
            class="nq-pill-stretch"
            :class="secondaryActionActive ? 'nq-pill-blue' : 'nq-pill-secondary'"
            @click="onSecondaryAction"
          >
            {{ secondaryActionLabel }}
          </button>
          <button
            v-if="showRefresh"
            type="button"
            class="refresh-btn"
            :disabled="deckItems.length === 0"
            aria-label="Show another set of titles"
            @click="$emit('refresh')"
          >
            <NqIcon name="cycle" :size="20" />
          </button>
        </div>
      </div>
    </div>

    <div class="dock">
      <div
        ref="stripEl"
        class="strip"
        role="listbox"
        :aria-label="stripLabel"
        @scroll.passive="onStripScroll"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          v-for="(item, index) in deckItems"
          :key="item.title.id"
          class="poster-wrap"
          role="option"
          :aria-selected="index === selectedIndex"
        >
          <button
            type="button"
            class="poster"
            :class="{ 'is-selected': index === selectedIndex }"
            :aria-label="item.title.title"
            @click="onPosterClick(index)"
          >
            <PosterImg
              v-if="item.title.posterUrl"
              :src="item.title.posterUrl"
              :alt="item.title.title"
              :spinner-size="22"
            />
            <span v-else class="poster-fallback">{{
              item.title.title.slice(0, 1)
            }}</span>
          </button>
          <button
            v-if="index === selectedIndex"
            type="button"
            class="open-btn"
            :aria-label="`Open ${item.title.title}`"
            @click.stop="openSelected"
          >
            <NqIcon name="arrow-top-right" :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref, watch } from "vue";
import type { TitleSummary } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import PosterImg from "@/components/PosterImg.vue";
import {
  captureDeckSelection,
  deckScrollLeftToCenter,
  loadDeckSelection,
  resolveDeckScrollIndex,
  saveDeckSelection,
  syncDeckItems,
} from "@/lib/deckSelection";

export type DeckItem = {
  title: TitleSummary;
  sampleWallets?: string[];
};

const props = withDefaults(
  defineProps<{
    items: DeckItem[];
    selectionKey?: string;
    stripLabel?: string;
    dockBottomOffset?: string;
    showSocial?: boolean;
    showRefresh?: boolean;
    actionsPrefix?: string;
    primaryActionLabel?: string;
    primaryActionActive?: boolean;
    secondaryActionLabel?: string;
    secondaryActionActive?: boolean;
  }>(),
  {
    selectionKey: "deck",
    stripLabel: "Titles",
    dockBottomOffset: "0px",
    showSocial: false,
    showRefresh: false,
    primaryActionLabel: "",
    primaryActionActive: false,
    secondaryActionLabel: "",
    secondaryActionActive: false,
  }
);

const emit = defineEmits<{
  open: [titleId: string];
  "primary-action": [titleId: string];
  "secondary-action": [titleId: string];
  refresh: [];
  select: [titleId: string];
}>();

const stripEl = ref<HTMLElement | null>(null);
const restored = syncDeckItems(props.items, loadDeckSelection(props.selectionKey));
const deckItems = ref<DeckItem[]>(restored.items);
const selectedIndex = ref(restored.selectedIndex);
const suppressSelect = ref(false);
const pinnedIndex = ref<number | null>(null);

const selected = computed(() => deckItems.value[selectedIndex.value] ?? null);

const pickerStyle = computed(() => ({
  "--picker-dock-bottom-offset": props.dockBottomOffset,
}));

let dragging = false;
let dragStartX = 0;
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
let snapTimer: ReturnType<typeof setTimeout> | undefined;

function mediaLabel(title: TitleSummary) {
  const kind = title.mediaType || title.kind;
  return kind === "tv" ? "TV" : "Movie";
}

function persistSelection() {
  const snapshot = captureDeckSelection(deckItems.value, selectedIndex.value);
  saveDeckSelection(props.selectionKey, snapshot);
}

function persistVisibleCard() {
  if (stripEl.value && !suppressSelect.value) {
    selectedIndex.value = resolveDeckScrollIndex(
      pinnedIndex.value,
      nearestIndex()
    );
  }
  persistSelection();
}

function resetFromPool() {
  const next = syncDeckItems(props.items, loadDeckSelection(props.selectionKey));
  deckItems.value = next.items;
  selectedIndex.value = next.selectedIndex;
  persistSelection();
  const titleId = deckItems.value[selectedIndex.value]?.title.id;
  if (titleId) emit("select", titleId);
  void snapToIndex(selectedIndex.value, "auto");
}

function openSelected() {
  persistVisibleCard();
  const titleId = selected.value?.title.id;
  if (titleId) emit("open", titleId);
}

function onPrimaryAction() {
  const titleId = selected.value?.title.id;
  if (titleId) emit("primary-action", titleId);
}

function onSecondaryAction() {
  const titleId = selected.value?.title.id;
  if (titleId) emit("secondary-action", titleId);
}

async function snapToIndex(
  index: number,
  behavior: ScrollBehavior,
  fromIndex = selectedIndex.value
) {
  suppressSelect.value = true;
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const strip = stripEl.value;
  if (!strip || !strip.children[index]) {
    suppressSelect.value = false;
    return;
  }

  const distance = Math.abs(index - fromIndex);
  const bypassSnap = behavior === "smooth" && distance > 1;
  if (bypassSnap) strip.style.scrollSnapType = "none";

  strip.scrollTo({
    left: deckScrollLeftToCenter(strip, index),
    behavior,
  });

  const settleMs =
    behavior === "smooth"
      ? bypassSnap
        ? Math.min(520, 220 + distance * 45)
        : 280
      : 40;

  if (snapTimer) clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    if (bypassSnap) strip.style.scrollSnapType = "";
    suppressSelect.value = false;
  }, settleMs);
}

function nearestIndex(): number {
  const strip = stripEl.value;
  if (!strip || strip.children.length === 0) return 0;
  const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < strip.children.length; i++) {
    const child = strip.children[i] as HTMLElement;
    const rect = child.getBoundingClientRect();
    const dist = Math.abs(rect.left + rect.width / 2 - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function syncSelectedFromScroll() {
  if (suppressSelect.value) return;
  selectedIndex.value = resolveDeckScrollIndex(
    pinnedIndex.value,
    nearestIndex()
  );
  persistSelection();
  const titleId = deckItems.value[selectedIndex.value]?.title.id;
  if (titleId) emit("select", titleId);
}

function onStripScroll() {
  if (suppressSelect.value) return;
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(syncSelectedFromScroll, 80);
}

function onPointerDown(event: PointerEvent) {
  dragging = false;
  dragStartX = event.clientX;
}

function onPointerUp(event: PointerEvent) {
  dragging = Math.abs(event.clientX - dragStartX) > 10;
  if (dragging) pinnedIndex.value = null;
}

function onPosterClick(index: number) {
  if (dragging) return;
  if (index === selectedIndex.value) return;
  const fromIndex = selectedIndex.value;
  pinnedIndex.value = index;
  selectedIndex.value = index;
  persistSelection();
  const titleId = deckItems.value[index]?.title.id;
  if (titleId) emit("select", titleId);
  void snapToIndex(index, "smooth", fromIndex);
}

watch(
  () => props.items.map((item) => item.title.id).join("|"),
  () => {
    resetFromPool();
  }
);

onMounted(() => {
  persistSelection();
  void snapToIndex(selectedIndex.value, "auto");
  const titleId = deckItems.value[selectedIndex.value]?.title.id;
  if (titleId) emit("select", titleId);
  window.addEventListener("resize", onResize);
});

onActivated(() => {
  void snapToIndex(selectedIndex.value, "auto");
});

onUnmounted(() => {
  persistSelection();
  window.removeEventListener("resize", onResize);
  if (scrollTimer) clearTimeout(scrollTimer);
  if (snapTimer) clearTimeout(snapTimer);
});

function onResize() {
  void snapToIndex(selectedIndex.value, "auto");
}
</script>

<style scoped>
.picker {
  --picker-poster: 5.6rem;
  --picker-dock-height: 10.75rem;
  --picker-dock-bottom-offset: 0px;
}

.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0 calc(var(--picker-dock-height) + 0.5rem);
}

.hero {
  display: block;
  width: min(36vw, 8.75rem);
  aspect-ratio: 2 / 3;
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  flex-shrink: 0;
  cursor: pointer;
  color: inherit;
  box-shadow: 0 12px 28px color-mix(in oklch, var(--colors-neutral) 28%, transparent);
  -webkit-tap-highlight-color: transparent;
}

.hero img,
.hero :deep(.poster-img) {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-fallback,
.poster-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  color: var(--text-secondary);
  font-weight: 700;
}

.meta {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  text-align: center;
  min-width: 0;
}

.meta h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.meta-line {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.dot {
  opacity: 0.55;
  padding: 0 0.15rem;
}

.rating {
  color: var(--warning);
  font-weight: 600;
}

.overview {
  margin: 0;
  max-width: 36rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.favorites {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.favorites-ico {
  color: var(--primary);
}

.favorite-faces {
  display: flex;
  align-items: center;
}

.favorite-face {
  margin-left: -6px;
  box-shadow: 0 0 0 1.5px var(--bg-primary);
  border-radius: 50%;
}

.favorite-face:first-child {
  margin-left: 0;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 22rem;
  margin-top: 0.15rem;
  flex-wrap: wrap;
}

.actions-prefix {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 0.92rem;
  font-weight: 500;
  white-space: nowrap;
}

.actions .nq-pill-stretch {
  flex: 1 1 auto;
  width: auto;
  min-height: 2.4rem;
  min-width: 6.5rem;
}

.refresh-btn {
  flex: 0 0 2.4rem;
  width: 2.4rem;
  height: 2.4rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.refresh-btn:not(:disabled):active {
  filter: brightness(1.08);
}

.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--bottom-tabs-inset) + var(--picker-dock-bottom-offset));
  z-index: 44;
  padding-bottom: 0.15rem;
  background: linear-gradient(
    to top,
    var(--bg-primary) 0%,
    var(--bg-primary) 48%,
    transparent 100%
  );
  touch-action: none;
  overscroll-behavior: none;
}

.strip {
  display: flex;
  align-items: flex-end;
  gap: 0.55rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0.45rem calc(50% - var(--picker-poster) / 2) 0.45rem;
  scrollbar-width: none;
  touch-action: pan-x;
}

.strip::-webkit-scrollbar {
  display: none;
}

.poster-wrap {
  position: relative;
  flex: 0 0 var(--picker-poster);
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.poster {
  width: var(--picker-poster);
  aspect-ratio: 2 / 3;
  padding: 0;
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-surface);
  color: inherit;
  cursor: pointer;
  transform: scale(0.92);
  opacity: 0.72;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease,
    box-shadow 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.poster.is-selected {
  transform: scale(1);
  opacity: 1;
  box-shadow: 0 0 0 2px var(--gold);
}

.poster img,
.poster :deep(.poster-img) {
  width: 100%;
  height: 100%;
  display: block;
}

.open-btn {
  position: absolute;
  top: 0.3rem;
  left: 50%;
  z-index: 1;
  transform: translateX(-50%);
  width: 1.85rem;
  height: 1.85rem;
  display: grid;
  place-content: center;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px color-mix(in oklch, var(--primary) 45%, transparent);
  -webkit-tap-highlight-color: transparent;
}

.open-btn:active {
  filter: brightness(1.08);
}
</style>
