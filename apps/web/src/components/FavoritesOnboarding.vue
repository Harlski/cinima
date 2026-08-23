<template>
  <div class="favorites-onboarding">
    <header class="header">
      <div class="header-text">
        <h2>Pick your favorites</h2>
        <p>Tap at least {{ minFavorites }} titles you love</p>
      </div>
      <button type="button" class="skip" :disabled="busy" @click="$emit('skip')">
        Skip
      </button>
    </header>

    <div class="rows" role="group" aria-label="Favorite candidates">
      <PosterSlider
        v-for="(row, index) in upperRows"
        :key="`upper-${index}`"
        :titles="row"
        :selected-ids="selectedIds"
        empty=""
        @select="toggle"
      />

      <div v-if="bottomRow" class="bottom-row">
        <PosterSlider
          :titles="bottomRow"
          :selected-ids="selectedIds"
          empty=""
          @select="toggle"
        />

        <div v-if="canContinue" class="continue-dock">
          <button
            type="button"
            class="continue"
            :disabled="busy"
            @click="$emit('continue', [...selectedIds])"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { TitleSummary } from "@cinima/shared";
import PosterSlider from "@/components/PosterSlider.vue";
import { splitIntoRows } from "@/lib/onboardingRows";

const props = withDefaults(
  defineProps<{
    candidates: TitleSummary[];
    minFavorites?: number;
    busy?: boolean;
  }>(),
  {
    minFavorites: 3,
    busy: false,
  }
);

defineEmits<{
  continue: [titleIds: string[]];
  skip: [];
}>();

const selectedIds = ref<Set<string>>(new Set());

const rows = computed(() =>
  splitIntoRows(props.candidates, 3).filter((row) => row.length > 0)
);

const upperRows = computed(() => rows.value.slice(0, -1));
const bottomRow = computed(() => rows.value[rows.value.length - 1] ?? null);

const canContinue = computed(() => selectedIds.value.size >= props.minFavorites);

function toggle(title: TitleSummary) {
  const next = new Set(selectedIds.value);
  if (next.has(title.id)) next.delete(title.id);
  else next.add(title.id);
  selectedIds.value = next;
}
</script>

<style scoped>
.favorites-onboarding {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: calc(100dvh - var(--app-brand-row, 3.5rem) - var(--bottom-tabs-inset));
  padding-bottom: 1rem;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.5rem;
}

.header-text {
  min-width: 0;
}

.header-text h2 {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  color: var(--text-primary);
}

.header-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.35;
}

.skip {
  flex-shrink: 0;
  margin-top: 0.15rem;
  padding: 0.35rem 0.15rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.skip:disabled {
  opacity: 0.5;
  cursor: default;
}

.skip:not(:disabled):active {
  opacity: 0.75;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.rows :deep(.empty) {
  display: none;
}

.bottom-row {
  position: relative;
  /* Space for Continue straddling the poster bottoms */
  margin-bottom: 2.75rem;
}

.continue-dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  display: flex;
  justify-content: center;
  transform: translateY(50%);
  pointer-events: none;
}

.continue {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  margin: 0;
  padding: 1.2rem 1.65rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.9rem;
  background: var(--colors-neutral-200);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 0 18px rgba(255, 255, 255, 0.35),
    0 0 36px rgba(255, 255, 255, 0.18);
  -webkit-tap-highlight-color: transparent;
}

.continue:hover:not(:disabled) {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 0 22px rgba(255, 255, 255, 0.45),
    0 0 44px rgba(255, 255, 255, 0.22);
}

.continue:disabled {
  opacity: 0.7;
  cursor: wait;
}

.continue:active:not(:disabled) {
  transform: scale(0.98);
}
</style>
