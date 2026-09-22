<template>
  <ul class="lookup-list">
    <li v-for="item in items" :key="item.id" class="lookup-swipe">
      <button
        type="button"
        class="lookup-remove"
        :aria-label="`Remove ${item.title}`"
        @click="emit('remove', item)"
      >
        Remove
      </button>
      <button
        type="button"
        class="lookup-item"
        :class="{ 'lookup-item--dragging': dragId === item.id }"
        :style="{ transform: `translateX(${offsetFor(item.id)}px)` }"
        @pointerdown="onPointerDown(item.id, $event)"
        @pointermove="onPointerMove(item.id, $event)"
        @pointerup="onPointerUp(item.id, $event)"
        @pointercancel="onPointerUp(item.id, $event)"
        @click="onOpen(item, $event)"
      >
        <span class="lookup-poster">
          <PosterImg v-if="item.posterUrl" :src="item.posterUrl" :alt="item.title" />
          <span v-else class="lookup-fallback">{{ item.title.charAt(0) }}</span>
        </span>
        <span class="lookup-text">
          <span class="lookup-title">{{ item.title }}</span>
          <span class="lookup-meta">
            {{ item.year ? `${item.year} · ` : "" }}{{ item.mediaType === "tv" ? "TV" : "Movie" }}
          </span>
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PosterImg from "@/components/PosterImg.vue";
import type { TitleLookup } from "@/lib/searchTitleLookups";
import {
  swipeRemoveDragX,
  swipeRemoveRest,
  swipeRemoveRestX,
} from "@/lib/swipeRemove";

const props = defineProps<{ items: TitleLookup[] }>();

const emit = defineEmits<{
  open: [item: TitleLookup];
  remove: [item: TitleLookup];
}>();

const offsets = ref<Record<string, number>>({});
const dragId = ref<string | null>(null);
const dragged = ref(false);

let startX = 0;
let startY = 0;
let originX = 0;
let pointerId: number | null = null;

function offsetFor(id: string): number {
  return offsets.value[id] ?? 0;
}

function setOffset(id: string, x: number) {
  offsets.value = { ...offsets.value, [id]: x };
}

function onPointerDown(id: string, event: PointerEvent) {
  if (event.button !== 0) return;
  pointerId = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  originX = offsetFor(id);
  dragged.value = false;
  dragId.value = id;
  try {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  } catch {
    // Synthetic or already-ended pointers cannot be captured.
  }
}

function onPointerMove(id: string, event: PointerEvent) {
  if (pointerId !== event.pointerId || dragId.value !== id) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  if (!dragged.value && Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 8) return;
  if (Math.abs(dx) > 8) dragged.value = true;
  const width = (event.currentTarget as HTMLElement).offsetWidth;
  setOffset(id, swipeRemoveDragX(originX + dx, width));
}

function onPointerUp(id: string, event: PointerEvent) {
  if (pointerId !== event.pointerId) return;
  pointerId = null;
  dragId.value = null;
  const rest = swipeRemoveRest(offsetFor(id));
  if (rest === "commit") {
    setOffset(id, 0);
    const item = findItem(id);
    if (item) emit("remove", item);
    return;
  }
  setOffset(id, swipeRemoveRestX(rest));
}

function findItem(id: string): TitleLookup | undefined {
  return props.items.find((item) => item.id === id);
}

function onOpen(item: TitleLookup, event: MouseEvent) {
  if (dragged.value) {
    event.preventDefault();
    dragged.value = false;
    return;
  }
  if (offsetFor(item.id) !== 0) {
    setOffset(item.id, 0);
    return;
  }
  emit("open", item);
}
</script>

<style scoped>
.lookup-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.lookup-swipe {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  touch-action: pan-y;
}

.lookup-remove {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 4rem;
  border: 0;
  background: var(--error);
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.lookup-item {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.55rem;
  border: 0;
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  touch-action: pan-y;
  transition: transform 0.16s ease;
  -webkit-tap-highlight-color: transparent;
}

.lookup-item--dragging {
  transition: none;
}

.lookup-poster {
  width: 2.4rem;
  height: 3.4rem;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 6px;
  background: var(--bg-primary);
}

.lookup-poster :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lookup-fallback {
  display: grid;
  place-content: center;
  width: 100%;
  height: 100%;
  font-weight: 700;
  color: var(--text-secondary);
}

.lookup-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.lookup-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.lookup-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
