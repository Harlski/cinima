<template>
  <div class="picker" :style="pickerStyle">
    <div v-if="selected" class="detail">
      <div class="poster-section">
        <button
          type="button"
          class="poster poster-press"
          :aria-label="`Open ${selected.title.title}`"
          @click="openSelected"
        >
          <PosterImg
            v-if="selected.title.posterUrl"
            :src="selected.title.posterUrl"
            :alt="selected.title.title"
          />
          <div v-else class="poster-fallback">{{ selected.title.title }}</div>
        </button>

        <div class="meta">
          <h2>{{ selected.title.title }}</h2>
          <p class="meta-line">
            <span
              class="rating"
              :class="{ muted: !hasTitleRating(selected.title.rating) }"
            >
              <NqIcon name="star" :size="14" />
              {{ formatTitleRating(selected.title.rating) }}
            </span>
            <span
              >{{ selected.title.year ? `${selected.title.year} - ` : ""
              }}{{ mediaLabel(selected.title) }}</span
            >
          </p>

          <p
            v-if="showTasteCounts"
            class="taste-counts"
            aria-label="Peer Recommends and Favorites"
          >
            <span class="taste-count taste-count--recommend">
              {{ recommendCountLabel }}
            </span>
            <span class="taste-sep" aria-hidden="true">,</span>
            <span class="taste-count">{{ favoriteCountLabel }}</span>
          </p>

          <div v-if="showActions" class="meta-actions">
            <div v-if="actionsPrefix || showRefresh" class="actions-row">
              <span v-if="actionsPrefix" class="actions-prefix">{{ actionsPrefix }}</span>
              <button
                v-if="showRefresh"
                type="button"
                class="refresh-btn"
                :disabled="deckItems.length === 0"
                aria-label="Show another set of titles"
                @click="$emit('refresh')"
              >
                <NqIcon name="cycle" :size="18" />
              </button>
            </div>
            <TourSpotlight
              v-if="primaryActionLabel"
              :id="TOUR_SPOTLIGHT.deckWatchlist"
              radius="999px"
            >
              <button
                type="button"
                class="nq-pill-stretch"
                :class="primaryActionActive ? 'nq-pill-gold' : 'nq-pill-secondary'"
                :data-tour="TOUR_SPOTLIGHT.deckWatchlist"
                @click="onPrimaryAction"
              >
                {{ primaryActionLabel }}
              </button>
            </TourSpotlight>
            <TourSpotlight
              v-if="secondaryActionLabel"
              :id="TOUR_SPOTLIGHT.deckFavorite"
              radius="999px"
            >
              <button
                type="button"
                class="nq-pill-stretch"
                :class="secondaryActionActive ? 'nq-pill-blue' : 'nq-pill-secondary'"
                :data-tour="TOUR_SPOTLIGHT.deckFavorite"
                @click="onSecondaryAction"
              >
                {{ secondaryActionLabel }}
              </button>
            </TourSpotlight>
          </div>
        </div>
      </div>

      <ExpandableText
        v-if="selected.title.overview"
        class="overview"
        :text="selected.title.overview"
        :lines="4"
        emit-read-more
        @read-more="openSelectedOverview"
      />
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
            class="strip-poster"
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
import ExpandableText from "@/components/ExpandableText.vue";
import NqIcon from "@/components/NqIcon.vue";
import PosterImg from "@/components/PosterImg.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import { TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { formatTitleRating, hasTitleRating } from "@/lib/titleRating";
import {
  captureDeckSelection,
  deckScrollLeftToCenter,
  loadDeckSelection,
  rememberedSelectionForPreferred,
  resolveDeckScrollIndex,
  saveDeckSelection,
  syncDeckItems,
} from "@/lib/deckSelection";

export type DeckItem = {
  title: TitleSummary;
  sampleWallets?: string[];
  recommendCount?: number;
  favoriteCount?: number;
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
    /** Force this title selected when present (guided tour). */
    preferredTitleId?: string | null;
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
    preferredTitleId: null,
  }
);

const emit = defineEmits<{
  open: [titleId: string];
  "open-overview": [titleId: string];
  "primary-action": [titleId: string];
  "secondary-action": [titleId: string];
  refresh: [];
  select: [titleId: string];
}>();

const stripEl = ref<HTMLElement | null>(null);
const restored = syncDeckItems(
  props.items,
  rememberedSelectionForPreferred(
    props.items,
    props.preferredTitleId,
    loadDeckSelection(props.selectionKey)
  )
);
const deckItems = ref<DeckItem[]>(restored.items);
const selectedIndex = ref(restored.selectedIndex);
const suppressSelect = ref(false);
const pinnedIndex = ref<number | null>(null);

const selected = computed(() => deckItems.value[selectedIndex.value] ?? null);
const showActions = computed(
  () =>
    Boolean(props.primaryActionLabel) ||
    Boolean(props.secondaryActionLabel) ||
    props.showRefresh
);
const showTasteCounts = computed(() => {
  if (!props.showSocial || !selected.value) return false;
  return (
    typeof selected.value.recommendCount === "number" &&
    typeof selected.value.favoriteCount === "number"
  );
});
const recommendCountLabel = computed(() => {
  const n = selected.value?.recommendCount ?? 0;
  return `${n} ${n === 1 ? "recommend" : "recommends"}`;
});
const favoriteCountLabel = computed(() => {
  const n = selected.value?.favoriteCount ?? 0;
  return `${n} ${n === 1 ? "favorite" : "favorites"}`;
});

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
  const next = syncDeckItems(
    props.items,
    rememberedSelectionForPreferred(
      props.items,
      props.preferredTitleId,
      loadDeckSelection(props.selectionKey)
    )
  );
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

function openSelectedOverview() {
  persistVisibleCard();
  const titleId = selected.value?.title.id;
  if (titleId) emit("open-overview", titleId);
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

watch(
  () => props.preferredTitleId,
  (id, prev) => {
    if (!id || id === prev) return;
    const idx = deckItems.value.findIndex((item) => item.title.id === id);
    if (idx < 0) {
      resetFromPool();
      return;
    }
    if (idx === selectedIndex.value) {
      emit("select", id);
      return;
    }
    selectedIndex.value = idx;
    persistSelection();
    emit("select", id);
    void snapToIndex(idx, "auto");
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
  gap: 0.85rem;
  padding: 0.5rem 0 calc(var(--picker-dock-height) + 0.5rem);
}

.poster-section {
  display: flex;
  align-items: stretch;
  gap: 1rem;
}

.poster {
  flex: none;
  width: 10rem;
  height: 15rem;
  aspect-ratio: 2 / 3;
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface);
  cursor: pointer;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}

.poster :deep(.poster-img),
.poster :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 700;
}

.meta {
  flex: 1;
  min-width: 0;
  max-height: 15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow: hidden;
}

.meta h2 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.2;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.meta-line {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.3;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--warning);
  font-weight: 600;
}

.rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.rating :deep(.nq-icon) {
  width: 14px;
  height: 14px;
}

.taste-counts {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem;
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.3;
  color: var(--text-secondary);
}

.taste-count {
  color: inherit;
  font: inherit;
}

.taste-count--recommend {
  color: var(--gold);
  font-weight: 600;
}

.taste-sep {
  margin-right: 0.15rem;
}

.meta-actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: auto;
  min-height: 0;
}

.actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.5rem;
}

.actions-prefix {
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
}

.meta .nq-pill-stretch {
  font-size: 0.78rem;
  padding: 0.22rem 0.65rem;
  line-height: 1.25;
}

.overview {
  display: block;
  min-width: 0;
}

.refresh-btn {
  flex: 0 0 1.85rem;
  width: 1.85rem;
  height: 1.85rem;
  margin-left: auto;
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

.strip-poster {
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

.strip-poster.is-selected {
  transform: scale(1);
  opacity: 1;
  box-shadow: 0 0 0 2px var(--gold);
}

.strip-poster img,
.strip-poster :deep(.poster-img) {
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
