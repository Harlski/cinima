<template>
  <span
    class="brand-wordmark"
    :class="[
      sizeClass,
      {
        'brand-wordmark--animate': animate,
        'brand-wordmark--accent': accent,
      },
    ]"
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
    /** Static gold NIM letters (header look, no motion). */
    accent?: boolean;
  }>(),
  { size: "md", animate: false, accent: false }
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

.brand-wordmark--accent .brand-wordmark__letter {
  color: #fff;
}

.brand-wordmark--accent .brand-wordmark__letter--nim {
  color: var(--gold);
}

/*
  8s loop (absolute %). All letters gray at rest.
  Gold travels C→I→N→I→M→A (~1.4s), then NIM pulses 3× (Ci–Nim–A),
  holds solid gold 5s, fades, repeats.
*/
.brand-wordmark--animate .brand-wordmark__letter--i0 {
  animation: brand-flash-0 8s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i1 {
  animation: brand-flash-1 8s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i2 {
  animation: brand-flash-2 8s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i3 {
  animation: brand-flash-3 8s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i4 {
  animation: brand-flash-4 8s linear infinite;
}
.brand-wordmark--animate .brand-wordmark__letter--i5 {
  animation: brand-flash-5 8s linear infinite;
}

/* Letter cascade: soft rise to gold then back to gray (~0–1.4s). */
@keyframes brand-flash-0 {
  0%,
  0.4% {
    color: var(--text-secondary);
  }
  2.2% {
    color: var(--gold);
  }
  4.4%,
  100% {
    color: var(--text-secondary);
  }
}

@keyframes brand-flash-1 {
  0%,
  3.1% {
    color: var(--text-secondary);
  }
  4.8% {
    color: var(--gold);
  }
  7%,
  100% {
    color: var(--text-secondary);
  }
}

@keyframes brand-flash-2 {
  0%,
  5.7% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  7.4% {
    color: var(--gold);
    transform: scale(1);
  }
  9.6%,
  17.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  20.1% {
    color: var(--gold);
    transform: scale(1.08);
  }
  22.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  24.9% {
    color: var(--gold);
    transform: scale(1.08);
  }
  27.3% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  29.8% {
    color: var(--gold);
    transform: scale(1.05);
  }
  31.3%,
  93.8% {
    color: var(--gold);
    transform: scale(1);
  }
  100% {
    color: var(--text-secondary);
    transform: scale(1);
  }
}

@keyframes brand-flash-3 {
  0%,
  8.3% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  10.1% {
    color: var(--gold);
    transform: scale(1);
  }
  12.3%,
  17.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  20.1% {
    color: var(--gold);
    transform: scale(1.08);
  }
  22.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  24.9% {
    color: var(--gold);
    transform: scale(1.08);
  }
  27.3% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  29.8% {
    color: var(--gold);
    transform: scale(1.05);
  }
  31.3%,
  93.8% {
    color: var(--gold);
    transform: scale(1);
  }
  100% {
    color: var(--text-secondary);
    transform: scale(1);
  }
}

@keyframes brand-flash-4 {
  0%,
  10.9% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  12.7% {
    color: var(--gold);
    transform: scale(1);
  }
  14.9%,
  17.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  20.1% {
    color: var(--gold);
    transform: scale(1.08);
  }
  22.5% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  24.9% {
    color: var(--gold);
    transform: scale(1.08);
  }
  27.3% {
    color: var(--text-secondary);
    transform: scale(1);
  }
  29.8% {
    color: var(--gold);
    transform: scale(1.05);
  }
  31.3%,
  93.8% {
    color: var(--gold);
    transform: scale(1);
  }
  100% {
    color: var(--text-secondary);
    transform: scale(1);
  }
}

@keyframes brand-flash-5 {
  0%,
  13.6% {
    color: var(--text-secondary);
  }
  15.3% {
    color: var(--gold);
  }
  17.5%,
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
