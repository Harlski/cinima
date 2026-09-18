<template>
  <div
    class="gold-glow-shell"
    :class="{
      'gold-glow-shell--soft': useSoft,
      'gold-glow-shell--strong': strong,
    }"
    :style="shellStyle"
  >
    <div class="gold-glow-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  goldGlowHaloBlurPx,
  goldGlowHaloInsetPx,
  goldGlowRimInsetPx,
  goldGlowRimWidthPx,
  goldGlowShellBleedPx,
} from "@/lib/goldGlow";

const props = withDefaults(
  defineProps<{
    /** CSS border-radius for the frame (matches the slotted surface). */
    radius?: string;
    /** Soft blurred halo behind the rotating outline (share cards). */
    soft?: boolean;
    /** Thicker rim and brighter bloom (Guided tour targets). */
    strong?: boolean;
  }>(),
  {
    radius: "12px",
    soft: true,
    strong: false,
  }
);

const useSoft = computed(() => props.soft || props.strong);

const shellStyle = computed(() => ({
  "--gold-glow-radius": props.radius,
  "--gold-glow-bleed": `${goldGlowShellBleedPx(useSoft.value, props.strong)}px`,
  "--gold-glow-halo-inset": `${goldGlowHaloInsetPx(useSoft.value, props.strong)}px`,
  "--gold-glow-halo-blur": `${goldGlowHaloBlurPx(props.strong)}px`,
  "--gold-glow-rim-inset": `${goldGlowRimInsetPx(props.strong)}px`,
  "--gold-glow-rim-width": `${goldGlowRimWidthPx(props.strong)}px`,
}));
</script>

<style scoped>
.gold-glow-shell {
  position: relative;
  box-sizing: content-box;
  padding: var(--gold-glow-bleed, 0px);
  margin: calc(-1 * var(--gold-glow-bleed, 0px));
  overflow: visible;
  pointer-events: none;
  flex-shrink: 0;
}

.gold-glow-shell--soft::before,
.gold-glow-shell::after {
  content: "";
  position: absolute;
  inset: calc(var(--gold-glow-bleed, 0px) - var(--gold-glow-rim-inset, 2px));
  border-radius: var(--gold-glow-radius, 12px);
  pointer-events: none;
  background: conic-gradient(
    from var(--gold-glow-angle, 0deg),
    transparent 0deg 195deg,
    color-mix(in oklch, var(--gold) 20%, transparent) 230deg,
    var(--gold) 270deg,
    #ffe9a8 295deg,
    var(--gold) 325deg,
    transparent 360deg
  );
  animation: gold-glow-spin 5.5s linear infinite;
}

.gold-glow-shell--soft::before {
  z-index: 0;
  inset: calc(var(--gold-glow-bleed, 0px) - var(--gold-glow-halo-inset, 8px));
  filter: blur(var(--gold-glow-halo-blur, 12px));
  opacity: 0.65;
}

.gold-glow-shell--strong::before,
.gold-glow-shell--strong::after {
  background: conic-gradient(
    from var(--gold-glow-angle, 0deg),
    color-mix(in oklch, var(--gold) 42%, transparent) 0deg,
    var(--gold) 50deg,
    #ffe9a8 90deg,
    var(--gold) 135deg,
    color-mix(in oklch, var(--gold) 58%, transparent) 200deg,
    color-mix(in oklch, var(--gold) 32%, transparent) 275deg,
    color-mix(in oklch, var(--gold) 42%, transparent) 360deg
  );
}

.gold-glow-shell--strong::before {
  opacity: 0.92;
}

.gold-glow-shell::after {
  z-index: 0;
  padding: var(--gold-glow-rim-width, 1.5px);
  opacity: 0.95;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.gold-glow-shell--strong::after {
  opacity: 1;
}

.gold-glow-content {
  position: relative;
  z-index: 1;
  border-radius: var(--gold-glow-radius, 12px);
  pointer-events: auto;
}

@property --gold-glow-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes gold-glow-spin {
  to {
    --gold-glow-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gold-glow-shell--soft::before,
  .gold-glow-shell::after {
    animation: none;
  }
}
</style>
