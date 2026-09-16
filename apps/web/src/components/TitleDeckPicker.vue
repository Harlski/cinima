<template>
  <div class="picker" :class="{ 'picker--passable': allowPass }" :style="pickerStyle">
    <div v-if="selected" class="detail" :class="{ 'detail--refill-pending': isRefillPending(selectedIndex) }">
      <div class="poster-section" data-flight-origin>
        <button
          type="button"
          class="poster poster-press"
          :class="{
            'poster--refill-pending': isRefillPending(selectedIndex),
            'poster--flingable': allowFling,
            'poster--mixing': mixing,
          }"
          data-flight-poster
          :aria-label="`Open ${selected.title.title}`"
          @pointerdown="onHeroPointerDown"
          @pointermove="onHeroPointerMove"
          @pointerup="onHeroPointerUp"
          @pointercancel="onHeroPointerUp"
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
                @click="onPrimaryAction($event)"
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
                @click="onSecondaryAction($event)"
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
      <p v-if="allowPass && deckItems.length && !tourPassSpotlight" class="pass-hint">Swipe a card up to Pass</p>
      <div
        v-if="tourPassSpotlight"
        class="pass-swipe-arrow"
        aria-hidden="true"
      >
        <svg
          class="pass-swipe-arrow-mark"
          viewBox="0 0 24 24"
          width="40"
          height="40"
        >
          <path fill="currentColor" d="M12 3.2 22 18.8H2Z" />
        </svg>
      </div>
      <div
        ref="stripEl"
        class="strip"
        :class="{
          'strip--passable': allowPass,
          'strip--refilling': refillBlockingPass,
          'strip--mixing': mixing,
          'strip--flingable': allowFling,
        }"
        role="listbox"
        :aria-label="stripLabel"
        @scroll.passive="onStripScroll"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          v-for="(item, index) in deckItems"
          :key="allowFling ? `fling-slot-${index}` : item.title.id"
          class="poster-wrap"
          :class="{
            'poster-wrap--passable': allowPass,
            'poster-wrap--passing': leavingPassIds.includes(item.title.id),
            'poster-wrap--collapsing': collapsingPassIds.includes(item.title.id),
            'poster-wrap--refill-pending': isRefillPending(index),
          }"
          role="option"
          :aria-selected="index === selectedIndex"
          :data-for-you-slot="allowPass ? index : undefined"
          :data-tour="tourPassSpotlight ? TOUR_SPOTLIGHT.forYouPassCard : undefined"
          data-flight-poster
          @pointerdown="onWrapPointerDown(index, $event)"
          @pointermove="onWrapPointerMove($event)"
          @pointerup="onWrapPointerUp($event)"
          @pointercancel="onWrapPointerUp($event)"
        >
          <TourSpotlight
            v-if="tourPassSpotlight"
            :id="TOUR_SPOTLIGHT.forYouPassCard"
            radius="12px"
            class="for-you-tour-glow"
          />
          <button
            type="button"
            class="strip-poster"
            :class="{
              'is-selected': index === selectedIndex,
              'strip-poster--refill-pending': isRefillPending(index),
            }"
            :aria-label="
              allowPass && !refillBlockingPass
                ? `${item.title.title}. Swipe up to Pass`
                : item.title.title
            "
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
            v-if="index === selectedIndex && !isRefillPending(index) && !passOnly"
            type="button"
            class="open-btn"
            :aria-label="`Open ${item.title.title}`"
            @pointerdown.stop
            @click.stop="openSelected"
          >
            <NqIcon name="arrow-from-bottom" :size="16" />
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
  addPassLeavingId,
  canPassForYouSlot,
  isPassSwipe,
  lockPassAxis,
  passCollapseDeckAction,
  passCollapseShouldHold,
  omitPassLeavingIds,
  passDragProgress,
  passStripSnapBehavior,
  removePassLeavingId,
  PASS_COLLAPSE_MS,
} from "@/lib/forYouPass";
import { useForYouMotionStore } from "@/stores/forYouMotion";
import {
  captureDeckSelection,
  deckScrollLeftToCenter,
  loadDeckSelection,
  rememberedSelectionForPreferred,
  resolveDeckScrollIndex,
  saveDeckSelection,
  selectedIndexAfterDeckChange,
  syncDeckItems,
} from "@/lib/deckSelection";
import { titleFlightBoxFromElement } from "@/lib/titleFlight";
import {
  isWatchlistFling,
  isWatchlistFlingReorder,
  watchlistFlingCycleFrames,
  watchlistFlingDeckFocus,
  watchlistStripSlotGesture,
  WATCHLIST_FLING_CYCLE_STEP_MS,
} from "@/lib/watchlistFling";

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
    allowPass?: boolean;
    allowFling?: boolean;
    passOnly?: boolean;
    tourPassSpotlight?: boolean;
    alwaysCenter?: boolean;
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
    allowPass: false,
    allowFling: false,
    passOnly: false,
    tourPassSpotlight: false,
    alwaysCenter: false,
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
  "primary-action": [titleId: string, origin: MouseEvent];
  "secondary-action": [titleId: string, origin: MouseEvent];
  refresh: [];
  select: [titleId: string];
  pass: [titleId: string, origin: PointerEvent];
  fling: [titleId: string];
}>();

const stripEl = ref<HTMLElement | null>(null);

function selectionMemory() {
  return rememberedSelectionForPreferred(
    props.items,
    props.preferredTitleId,
    props.alwaysCenter ? null : loadDeckSelection(props.selectionKey)
  );
}

const restored = syncDeckItems(props.items, selectionMemory());
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
const passTracking = ref(false);
const leavingPassIds = ref<string[]>([]);
const collapsingPassIds = ref<string[]>([]);
let passPointerId: number | null = null;
let passStartX = 0;
let passStartY = 0;
let passStartScroll = 0;
let passAxis: "x" | "y" | null = null;
let passArmed = false;
let passFizzleId: number | null = null;
let passIndex: number | null = null;
let collapseTimer: ReturnType<typeof setTimeout> | undefined;
let collapseStartedAt = 0;
let flingPointerId: number | null = null;
let flingStartX = 0;
let flingStartY = 0;
let flingStartScroll = 0;
let flingAxis: "x" | "y" | null = null;
let flingArmed = false;
let flingIndex: number | null = null;
let flingCanCommit = false;
const mixing = ref(false);
const forYouMotion = useForYouMotionStore();
const pendingRefillSlots = computed(() => new Set(forYouMotion.pendingRefillSlots));
const refillBlockingPass = computed(
  () => props.allowPass && pendingRefillSlots.value.size > 0
);

function isRefillPending(index: number) {
  return props.allowPass && pendingRefillSlots.value.has(index);
}

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

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function resetFromPool(
  behavior: ScrollBehavior = "auto",
  pool: DeckItem[] = props.items
) {
  const previousIds = deckItems.value.map((item) => item.title.id);
  const previousSelected = selectedIndex.value;
  const remembered = selectionMemory();
  const next = syncDeckItems(pool, remembered);
  if (props.alwaysCenter && !remembered) {
    next.selectedIndex = selectedIndexAfterDeckChange(
      previousIds,
      next.items.map((item) => item.title.id),
      previousSelected
    );
  }
  deckItems.value = next.items;
  selectedIndex.value = next.selectedIndex;
  persistSelection();
  const titleId = deckItems.value[selectedIndex.value]?.title.id;
  if (titleId) emit("select", titleId);
  void snapToIndex(selectedIndex.value, behavior);
}

function finishPassCollapse() {
  const leaving = [
    ...new Set([...collapsingPassIds.value, ...leavingPassIds.value]),
  ];
  const nextIds = props.items.map((item) => item.title.id);
  const elapsed = collapseStartedAt ? Date.now() - collapseStartedAt : 0;
  if (
    passCollapseShouldHold({
      leavingIds: leaving,
      nextIds,
      elapsedMs: elapsed,
    })
  ) {
    const strip = stripEl.value;
    if (strip) strip.style.scrollSnapType = "none";
    if (collapseTimer) clearTimeout(collapseTimer);
    collapseTimer = setTimeout(finishPassCollapse, 50);
    return;
  }
  const pool = omitPassLeavingIds(props.items, leaving);
  collapsingPassIds.value = [];
  leavingPassIds.value = [];
  const strip = stripEl.value;
  if (strip) strip.style.scrollSnapType = "";
  resetFromPool(passStripSnapBehavior(prefersReducedMotion()), pool);
}

function schedulePassCollapseSettle() {
  if (collapseTimer) clearTimeout(collapseTimer);
  const elapsed = collapseStartedAt ? Date.now() - collapseStartedAt : 0;
  const wait = prefersReducedMotion()
    ? 0
    : Math.max(0, PASS_COLLAPSE_MS - elapsed);
  collapseTimer = setTimeout(finishPassCollapse, wait);
}

function canFlingDeck() {
  return props.allowFling && deckItems.value.length >= 2 && !mixing.value;
}

function openSelected() {
  if (props.passOnly || passArmed || flingArmed) return;
  if (props.allowFling && dragging) return;
  persistVisibleCard();
  const titleId = selected.value?.title.id;
  if (titleId) emit("open", titleId);
}

function openSelectedOverview() {
  persistVisibleCard();
  const titleId = selected.value?.title.id;
  if (titleId) emit("open-overview", titleId);
}

function onPrimaryAction(origin: MouseEvent) {
  const titleId = selected.value?.title.id;
  if (titleId) emit("primary-action", titleId, origin);
}

function onSecondaryAction(origin: MouseEvent) {
  const titleId = selected.value?.title.id;
  if (titleId) emit("secondary-action", titleId, origin);
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
  if (suppressSelect.value || collapsingPassIds.value.length) return;
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
  if (dragging || passArmed) return;
  if (!canPassForYouSlot(index, forYouMotion.pendingRefillSlots)) return;
  if (index === selectedIndex.value) return;
  const fromIndex = selectedIndex.value;
  pinnedIndex.value = index;
  selectedIndex.value = index;
  persistSelection();
  const titleId = deckItems.value[index]?.title.id;
  if (titleId) emit("select", titleId);
  void snapToIndex(index, "smooth", fromIndex);
}

function onWrapPointerDown(index: number, event: PointerEvent) {
  if (props.allowPass) {
    onCardPointerDown(index, event);
    return;
  }
  onFlingCardPointerDown(index, event);
}

function onWrapPointerMove(event: PointerEvent) {
  if (props.allowPass) {
    onCardPointerMove(event);
    return;
  }
  onFlingCardPointerMove(event);
}

function onWrapPointerUp(event: PointerEvent) {
  if (props.allowPass) {
    onCardPointerUp(event);
    return;
  }
  onFlingCardPointerUp(event);
}

function onHeroPointerDown(event: PointerEvent) {
  if (!canFlingDeck() || event.button !== 0) return;
  flingPointerId = event.pointerId;
  flingStartX = event.clientX;
  flingStartY = event.clientY;
  flingAxis = null;
  flingIndex = selectedIndex.value;
  dragging = false;
  dragStartX = event.clientX;
}

function onHeroPointerMove(event: PointerEvent) {
  if (flingPointerId !== event.pointerId || flingIndex == null) return;
  const dy = event.clientY - flingStartY;
  const dx = event.clientX - flingStartX;
  if (!flingAxis) {
    flingAxis = lockPassAxis(dx, dy);
    if (flingAxis === "y") {
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        /* no active pointer */
      }
    }
  }
  if (flingAxis === "y") {
    event.preventDefault();
    const poster = event.currentTarget as HTMLElement;
    poster.style.transform = `translateY(${Math.max(0, Math.min(dy, 72))}px)`;
  }
}

function onHeroPointerUp(event: PointerEvent) {
  if (flingPointerId !== event.pointerId) return;
  const dx = event.clientX - flingStartX;
  const dy = event.clientY - flingStartY;
  const axis = flingAxis;
  const poster = event.currentTarget as HTMLElement;
  poster.style.transform = "";
  flingPointerId = null;
  flingAxis = null;
  flingIndex = null;
  dragging = Math.abs(dx) > 10 || Math.abs(dy) > 10;
  if (axis === "y" && isWatchlistFling(dx, dy)) {
    commitFling();
  }
}

function onFlingCardPointerDown(index: number, event: PointerEvent) {
  if (!canFlingDeck() || event.button !== 0) return;
  const gesture = watchlistStripSlotGesture(index, selectedIndex.value);
  if (!gesture.pan && !gesture.fling) return;
  event.stopPropagation();
  flingPointerId = event.pointerId;
  flingStartX = event.clientX;
  flingStartY = event.clientY;
  flingStartScroll = stripEl.value?.scrollLeft ?? 0;
  flingAxis = null;
  flingIndex = index;
  flingCanCommit = gesture.fling;
  dragging = false;
  dragStartX = event.clientX;
}

function onFlingCardPointerMove(event: PointerEvent) {
  if (flingPointerId !== event.pointerId || flingIndex == null) return;
  const dx = event.clientX - flingStartX;
  const dy = event.clientY - flingStartY;
  if (!flingAxis) {
    flingAxis = lockPassAxis(dx, dy);
    if (!flingAxis) return;
    if (flingAxis === "x" && stripEl.value) {
      stripEl.value.style.scrollSnapType = "none";
    }
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* no active pointer */
    }
  }
  if (flingAxis === "y") {
    if (!flingCanCommit) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const wrap = event.currentTarget as HTMLElement;
    wrap.style.transform = `translateY(${Math.max(0, Math.min(dy, 72))}px)`;
    return;
  }
  const strip = stripEl.value;
  if (strip) strip.scrollLeft = flingStartScroll - dx;
}

function onFlingCardPointerUp(event: PointerEvent) {
  if (flingPointerId !== event.pointerId) return;
  const dx = event.clientX - flingStartX;
  const dy = event.clientY - flingStartY;
  const axis = flingAxis;
  const canCommit = flingCanCommit;
  const wrap = event.currentTarget as HTMLElement;
  wrap.style.transform = "";
  const strip = stripEl.value;
  if (strip) strip.style.scrollSnapType = "";
  flingPointerId = null;
  flingIndex = null;
  flingAxis = null;
  flingCanCommit = false;
  dragging = Math.abs(dx) > 10;
  if (dragging) pinnedIndex.value = null;
  if (axis === "y" && canCommit && isWatchlistFling(dx, dy)) {
    commitFling();
  }
}

function commitFling() {
  const titleId = selected.value?.title.id;
  if (!titleId || !canFlingDeck()) return;
  flingArmed = true;
  emit("fling", titleId);
  window.setTimeout(() => {
    flingArmed = false;
  }, 400);
}

async function mixDeckTo(pool: DeckItem[]) {
  const keepIndex = selectedIndex.value;
  const byId = new Map<string, DeckItem>(
    pool.map((item) => [item.title.id as string, item])
  );
  const previousIds = deckItems.value.map((item) => item.title.id);
  const nextIds = pool.map((item) => item.title.id);
  mixing.value = true;
  pinnedIndex.value = null;
  try {
    if (!prefersReducedMotion()) {
      const frames = watchlistFlingCycleFrames({ previousIds, nextIds });
      for (const frame of frames) {
        deckItems.value = frame.flatMap((id) => {
          const item = byId.get(id);
          return item ? [item] : [];
        });
        await new Promise((resolve) =>
          setTimeout(resolve, WATCHLIST_FLING_CYCLE_STEP_MS)
        );
      }
    }
    deckItems.value = [...pool];
    selectedIndex.value = watchlistFlingDeckFocus(nextIds, keepIndex).selectedIndex;
    persistSelection();
    const titleId = deckItems.value[selectedIndex.value]?.title.id;
    if (titleId) emit("select", titleId);
  } finally {
    mixing.value = false;
  }
}

function onCardPointerDown(index: number, event: PointerEvent) {
  if (!props.allowPass || event.button !== 0) return;
  if (!canPassForYouSlot(index, forYouMotion.pendingRefillSlots)) return;
  event.stopPropagation();
  passTracking.value = true;
  passArmed = false;
  passAxis = null;
  passIndex = index;
  passPointerId = event.pointerId;
  passStartX = event.clientX;
  passStartY = event.clientY;
  passStartScroll = stripEl.value?.scrollLeft ?? 0;
  dragging = false;
  dragStartX = event.clientX;
}

function startPassToss(index: number, wrap: HTMLElement) {
  if (passFizzleId != null) return;
  if (!canPassForYouSlot(index, forYouMotion.pendingRefillSlots)) return;
  const item = deckItems.value[index];
  if (!item) return;
  leavingPassIds.value = addPassLeavingId(leavingPassIds.value, item.title.id);
  passFizzleId = forYouMotion.beginFizzle({
    title: item.title,
    from: titleFlightBoxFromElement(wrap),
  });
  if (passFizzleId == null && !collapsingPassIds.value.includes(item.title.id)) {
    leavingPassIds.value = removePassLeavingId(
      leavingPassIds.value,
      item.title.id
    );
  }
}

function onCardPointerMove(event: PointerEvent) {
  if (!passTracking.value || event.pointerId !== passPointerId) return;
  const dx = event.clientX - passStartX;
  const dy = event.clientY - passStartY;
  if (!passAxis) {
    passAxis = lockPassAxis(dx, dy);
    if (!passAxis) return;
    if (passAxis === "x" && stripEl.value) {
      stripEl.value.style.scrollSnapType = "none";
    }
    if (passAxis === "y" && passIndex != null) {
      startPassToss(passIndex, event.currentTarget as HTMLElement);
    }
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* no active pointer, e.g. synthetic events */
    }
  }
  if (passAxis === "y") {
    event.preventDefault();
    if (passFizzleId != null) {
      forYouMotion.setFizzleProgress(passFizzleId, passDragProgress(dy));
    }
    return;
  }
  const strip = stripEl.value;
  if (strip) strip.scrollLeft = passStartScroll - dx;
}

function onCardPointerUp(event: PointerEvent) {
  if (!passTracking.value || event.pointerId !== passPointerId) return;
  const dx = event.clientX - passStartX;
  const dy = event.clientY - passStartY;
  const axis = passAxis;
  const index = passIndex;
  const strip = stripEl.value;
  if (strip) strip.style.scrollSnapType = "";
  passTracking.value = false;
  passPointerId = null;
  passIndex = null;
  passAxis = null;
  dragging = Math.abs(dx) > 10;
  if (dragging) pinnedIndex.value = null;
  const titleId = index != null ? deckItems.value[index]?.title.id : undefined;
  if (axis === "y" && titleId && isPassSwipe(dx, dy)) {
    if (passFizzleId != null) forYouMotion.commitFizzle(passFizzleId);
    passFizzleId = null;
    passArmed = true;
    collapsingPassIds.value = addPassLeavingId(collapsingPassIds.value, titleId);
    leavingPassIds.value = addPassLeavingId(leavingPassIds.value, titleId);
    collapseStartedAt = Date.now();
    const stripNow = stripEl.value;
    if (stripNow) stripNow.style.scrollSnapType = "none";
    schedulePassCollapseSettle();
    emit("pass", titleId, event);
    window.setTimeout(() => {
      passArmed = false;
    }, 400);
    return;
  }
  if (passFizzleId != null) forYouMotion.cancelFizzle(passFizzleId);
  passFizzleId = null;
  if (titleId && !collapsingPassIds.value.includes(titleId)) {
    leavingPassIds.value = removePassLeavingId(leavingPassIds.value, titleId);
  }
}

watch(
  () => props.items.map((item) => item.title.id).join("|"),
  () => {
    const nextIds = props.items.map((item) => item.title.id);
    const collapsingIds = collapsingPassIds.value.length
      ? collapsingPassIds.value
      : leavingPassIds.value;
    const action = passCollapseDeckAction({
      collapsingIds,
      nextIds,
    });
    if (action === "collapse-removed") {
      if (!collapsingPassIds.value.length && collapsingIds.length) {
        collapsingPassIds.value = [...collapsingIds];
        collapseStartedAt = Date.now();
      }
      schedulePassCollapseSettle();
      return;
    }
    if (collapseTimer) clearTimeout(collapseTimer);
    collapsingPassIds.value = [];
    leavingPassIds.value = [];
    const previousIds = deckItems.value.map((item) => item.title.id);
    if (props.allowFling && isWatchlistFlingReorder(previousIds, nextIds)) {
      void mixDeckTo(props.items);
      return;
    }
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
  if (collapseTimer) clearTimeout(collapseTimer);
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

.picker--passable {
  --picker-dock-height: 12.15rem;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.5rem 0 calc(var(--picker-dock-height) + 0.5rem);
}

.detail--refill-pending {
  visibility: hidden;
}

.poster-section {
  display: flex;
  align-items: stretch;
  gap: 1rem;
}

.poster.poster--refill-pending,
.strip-poster.strip-poster--refill-pending,
.strip-poster.is-selected.strip-poster--refill-pending {
  visibility: hidden;
  border-color: transparent;
  pointer-events: none;
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

.poster--flingable {
  touch-action: none;
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
    to bottom,
    color-mix(in oklch, var(--bg-primary) 78%, transparent) 0%,
    transparent 42%
  );
  touch-action: none;
  overscroll-behavior: none;
}

.strip {
  --picker-strip-gap: 0.55rem;
  display: flex;
  align-items: flex-end;
  gap: var(--picker-strip-gap);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0.45rem calc(50% - var(--picker-poster) / 2) 0.45rem;
  scrollbar-width: none;
  touch-action: pan-x;
}

.strip--passable,
.strip--flingable {
  touch-action: none;
}

.strip--mixing {
  pointer-events: none;
}

.strip--mixing :deep(.poster-img-wait),
.poster--mixing :deep(.poster-img-wait) {
  display: none;
}

.strip--mixing :deep(img),
.poster--mixing :deep(img) {
  opacity: 1;
}

.strip::-webkit-scrollbar {
  display: none;
}

.pass-hint {
  margin: 0;
  padding: 0.2rem 1rem 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}

.poster-wrap {
  position: relative;
  flex: 0 0 var(--picker-poster);
  width: var(--picker-poster);
  min-width: var(--picker-poster);
  overflow: visible;
  scroll-snap-align: center;
  transition:
    flex-basis 360ms cubic-bezier(0.22, 0.08, 0.18, 1),
    width 360ms cubic-bezier(0.22, 0.08, 0.18, 1),
    min-width 360ms cubic-bezier(0.22, 0.08, 0.18, 1),
    margin 360ms cubic-bezier(0.22, 0.08, 0.18, 1);
}

.poster-wrap--passable {
  touch-action: none;
}

.for-you-tour-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.pass-swipe-arrow {
  display: flex;
  justify-content: center;
  margin: 0 0 0.2rem;
  pointer-events: none;
  color: var(--colors-orange);
  filter:
    drop-shadow(1px 0 0 #fff)
    drop-shadow(-1px 0 0 #fff)
    drop-shadow(0 1px 0 #fff)
    drop-shadow(0 -1px 0 #fff)
    drop-shadow(0 0 6px rgba(255, 255, 255, 0.95));
  animation: pass-swipe-nudge 1.15s ease-in-out infinite;
}

@keyframes pass-swipe-nudge {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.55rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pass-swipe-arrow {
    animation: none;
  }
}

.strip--refilling .poster-wrap {
  pointer-events: none;
}

.poster-wrap--refill-pending {
  pointer-events: none;
}

.poster-wrap--passing {
  visibility: hidden;
  pointer-events: none;
}

.poster-wrap--collapsing {
  flex-basis: 0;
  width: 0;
  min-width: 0;
  margin-inline-end: calc(-1 * var(--picker-strip-gap, 0.55rem));
  overflow: hidden;
  pointer-events: none;
  visibility: hidden;
  scroll-snap-align: none;
}

@media (prefers-reduced-motion: reduce) {
  .poster-wrap {
    transition: none;
  }
}

.strip-poster {
  width: var(--picker-poster);
  aspect-ratio: 2 / 3;
  box-sizing: border-box;
  padding: 0;
  border: 2px solid transparent;
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
    border-color 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.strip-poster.is-selected {
  position: relative;
  z-index: 1;
  transform: scale(1);
  opacity: 1;
  border-color: var(--gold);
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
  background: var(--gold);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px color-mix(in oklch, var(--gold) 45%, transparent);
  -webkit-tap-highlight-color: transparent;
}

.open-btn:active {
  filter: brightness(1.08);
}
</style>
