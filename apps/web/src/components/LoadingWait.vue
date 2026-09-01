<template>
  <div class="loading-wait">
    <NqSpinner :label="label" />
    <p class="loading-wait-line" aria-hidden="true">
      <Transition name="loading-line" mode="out-in">
        <span :key="line">{{ line }}</span>
      </Transition>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import NqSpinner from "@/components/NqSpinner.vue";
import {
  LOADING_WAIT_MS,
  nextLoadingLineIndex,
  shuffledLoadingLines,
} from "@/lib/loadingWait";

withDefaults(
  defineProps<{
    label?: string;
  }>(),
  { label: "Loading" }
);

const lines = shuffledLoadingLines();
const index = ref(0);
const line = computed(() => lines[index.value] ?? "");

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || lines.length < 2) return;
  timer = setInterval(() => {
    index.value = nextLoadingLineIndex(index.value, lines.length);
  }, LOADING_WAIT_MS);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.loading-wait {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
}

.loading-wait-line {
  margin: 0;
  min-height: 1.4em;
  min-width: 18ch;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-secondary);
}

.loading-wait-line span {
  display: inline-block;
}

.loading-line-enter-active,
.loading-line-leave-active {
  transition: opacity 0.28s ease;
}

.loading-line-enter-from,
.loading-line-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .loading-line-enter-active,
  .loading-line-leave-active {
    transition: none;
  }
}
</style>
