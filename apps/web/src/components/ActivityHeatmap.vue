<template>
  <div class="heatmap" v-if="days.length">
    <div class="heatmap-head">
      <h3>{{ title }}</h3>
      <span class="heatmap-sub">{{ total }} activities · last year</span>
    </div>
    <div ref="scrollEl" class="heatmap-scroll">
      <div class="heatmap-grid" :style="gridStyle">
        <div
          v-for="day in days"
          :key="day.date"
          class="cell"
          :class="day.count < 0 ? 'pad' : `lvl-${level(day.count)}`"
          :title="day.count < 0 ? undefined : `${day.date}: ${day.count}`"
        />
      </div>
    </div>
    <div class="legend">
      <span>Less</span>
      <i class="cell lvl-0" />
      <i class="cell lvl-1" />
      <i class="cell lvl-2" />
      <i class="cell lvl-3" />
      <i class="cell lvl-4" />
      <span>More</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { HeatmapDay } from "@nimcharts/shared";

const props = withDefaults(
  defineProps<{
    days: HeatmapDay[];
    title?: string;
  }>(),
  { title: "Activity" }
);

const scrollEl = ref<HTMLElement | null>(null);

const total = computed(() => props.days.reduce((s, d) => s + Math.max(0, d.count), 0));

/** Align first day to Sunday like GitHub (UTC). */
const padded = computed(() => {
  if (!props.days.length) return [] as HeatmapDay[];
  const first = new Date(props.days[0]!.date + "T00:00:00Z");
  const weekday = first.getUTCDay(); // 0=Sun
  const pad: HeatmapDay[] = [];
  for (let i = 0; i < weekday; i++) {
    pad.push({ date: `pad-${i}`, count: -1 });
  }
  return [...pad, ...props.days];
});

const weeks = computed(() => Math.ceil(padded.value.length / 7));

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${weeks.value}, 11px)`,
}));

function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const days = padded;

async function scrollToEnd() {
  await nextTick();
  const el = scrollEl.value;
  if (!el) return;
  el.scrollLeft = el.scrollWidth;
}

watch(
  () => props.days,
  () => {
    void scrollToEnd();
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.heatmap {
  padding: 1rem;
  background: var(--bg-surface);
  border-radius: 16px;
}

.heatmap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.heatmap-head h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.heatmap-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.heatmap-scroll {
  overflow-x: auto;
  padding-bottom: 0.35rem;
  -webkit-overflow-scrolling: touch;
}

.heatmap-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 11px);
  gap: 3px;
  width: max-content;
}

.cell {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  background: #21262d;
}

.cell.pad {
  visibility: hidden;
}

.cell.lvl-0 {
  background: #21262d;
}

.cell.lvl-1 {
  background: #0e4429;
}

.cell.lvl-2 {
  background: #006d32;
}

.cell.lvl-3 {
  background: #26a641;
}

.cell.lvl-4 {
  background: #39d353;
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.3rem;
  margin-top: 0.65rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.legend .cell {
  display: inline-block;
}
</style>
