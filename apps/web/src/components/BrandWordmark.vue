<template>
  <span
    class="brand-wordmark"
    :class="[sizeClass, { 'brand-wordmark--animate': animate }]"
    aria-label="Cinima"
  >
    <span
      v-for="(letter, i) in letters"
      :key="`${letter.ch}-${i}`"
      class="brand-wordmark__letter"
      :class="[
        `brand-wordmark__letter--i${i}`,
        { 'brand-wordmark__letter--nim': letter.nim },
      ]"
      aria-hidden="true"
      >{{ letter.ch }}</span
    >
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg";
    animate?: boolean;
  }>(),
  { size: "md", animate: false }
);

const letters = [
  { ch: "C", nim: false },
  { ch: "I", nim: false },
  { ch: "N", nim: true },
  { ch: "I", nim: true },
  { ch: "M", nim: true },
  { ch: "A", nim: false },
] as const;

const sizeClass = computed(() => `brand-wordmark--${props.size}`);
</script>

<style scoped>
.brand-wordmark {
  display: inline-flex;
  align-items: baseline;
  font-family: var(--font, "Mulish", system-ui, sans-serif);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
  color: var(--text-secondary);
}

.brand-wordmark--sm {
  font-size: 1.15rem;
}

.brand-wordmark--md {
  font-size: 1.35rem;
}

.brand-wordmark--lg {
  font-size: 2rem;
}

.brand-wordmark__letter {
  display: inline-block;
  font-weight: 500;
  color: var(--text-secondary);
  transform-origin: center bottom;
}

.brand-wordmark__letter--nim {
  font-weight: 700;
  letter-spacing: 0.04em;
}

/*
  7s loop (absolute %). All letters stay gray at rest.
  White travels C→I→N→I→M→A, then NIM pulses, then 5s hold.
*/
.brand-wordmark--animate .brand-wordmark__letter--i0 {
  animation: brand-flash-0 7s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i1 {
  animation: brand-flash-1 7s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i2 {
  animation: brand-flash-2 7s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i3 {
  animation: brand-flash-3 7s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i4 {
  animation: brand-flash-4 7s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i5 {
  animation: brand-flash-5 7s linear infinite;
}

/* Letter fades: soft rise to white then fall back to gray (~0–1.4s). */
@keyframes brand-flash-0 {
  0%,
  0.5% {
    color: var(--text-secondary);
  }
  2.5% {
    color: var(--text-primary);
  }
  5%,
  100% {
    color: var(--text-secondary);
  }
}

@keyframes brand-flash-1 {
  0%,
  3.5% {
    color: var(--text-secondary);
  }
  5.5% {
    color: var(--text-primary);
  }
  8%,
  100% {
    color: var(--text-secondary);
  }
}

@keyframes brand-flash-2 {
  0%,
  6.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  8.5% {
    color: var(--text-primary);
    transform: scale(1);
  }
  11%,
  20% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  23% {
    color: var(--text-primary);
    transform: scale(1.08);
  }
  26% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  28.5% {
    color: var(--text-primary);
    transform: scale(1.05);
  }
  32%,
  100% {
    color: var(--text-secondary);
    transform: scale(1);
  }
}

@keyframes brand-flash-3 {
  0%,
  9.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  11.5% {
    color: var(--text-primary);
    transform: scale(1);
  }
  14%,
  20% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  23% {
    color: var(--text-primary);
    transform: scale(1.08);
  }
  26% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  28.5% {
    color: var(--text-primary);
    transform: scale(1.05);
  }
  32%,
  100% {
    color: var(--text-secondary);
    transform: scale(1);
  }
}

@keyframes brand-flash-4 {
  0%,
  12.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  14.5% {
    color: var(--text-primary);
    transform: scale(1);
  }
  17%,
  20% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  23% {
    color: var(--text-primary);
    transform: scale(1.08);
  }
  26% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  28.5% {
    color: var(--text-primary);
    transform: scale(1.05);
  }
  32%,
  100% {
    color: var(--text-secondary);
    transform: scale(1);
  }
}

@keyframes brand-flash-5 {
  0%,
  15.5% {
    color: var(--text-secondary);
  }
  17.5% {
    color: var(--text-primary);
  }
  20%,
  100% {
    color: var(--text-secondary);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-wordmark--animate .brand-wordmark__letter {
    animation: none;
    color: var(--text-secondary);
  }
}
</style>
