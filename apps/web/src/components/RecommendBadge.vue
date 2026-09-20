<template>
  <span
    class="recommend-badge"
    :class="{ 'recommend-badge--spread': spread }"
    :style="{ fontSize: `${size}px` }"
    aria-hidden="true"
  >
    <svg
      v-if="spread"
      class="hex hex-back"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-1.2 -1.2 20.4 19.4"
      :width="size"
      :height="hexHeight"
    >
      <path
        class="hex-fill"
        d="m17.045 7.563-3.429-6.09a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L.954 7.563a1.44 1.44 0 000 1.405l3.43 6.088a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l3.43-6.088c.246-.436.246-.97.001-1.405Z"
      />
    </svg>
    <span class="hex-front">
      <svg
        class="hex"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-1.2 -1.2 20.4 19.4"
        :width="size"
        :height="hexHeight"
      >
        <path
          class="hex-fill"
          d="m17.045 7.563-3.429-6.09a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L.954 7.563a1.44 1.44 0 000 1.405l3.43 6.088a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l3.43-6.088c.246-.436.246-.97.001-1.405Z"
        />
      </svg>
      <span v-if="label != null" class="count">{{ label }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { recommendBadgeMark } from "@/lib/recommendBadge";

const props = withDefaults(
  defineProps<{
    size?: number;
    /** Mosaic: peers who Recommended this Title. Omit for a plain hex. */
    count?: number;
  }>(),
  { size: 28 }
);

const hexHeight = computed(() => Math.round((props.size * 17) / 18));
const mark = computed(() =>
  props.count == null ? null : recommendBadgeMark(props.count)
);
const spread = computed(() => mark.value?.kind === "spread");
const label = computed(() =>
  mark.value?.kind === "count" ? mark.value.count : null
);
</script>

<style scoped>
.recommend-badge {
  position: absolute;
  top: 0.22rem;
  right: 0.22rem;
  z-index: 2;
  display: grid;
  place-items: center;
  color: var(--gold);
  line-height: 0;
  filter:
    drop-shadow(0 0 0.5px #000)
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.75));
}

.recommend-badge--spread {
  overflow: visible;
}

.hex-front {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
}

.hex-front .hex,
.hex-front .count {
  grid-area: 1 / 1;
}

.hex-back {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(calc(-50% - 0.36em), -50%);
}

.recommend-badge--spread .hex-front {
  z-index: 0;
  transform: none;
}

.count {
  z-index: 1;
  color: #0a0a0f;
  font-size: 0.38em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.04em;
  pointer-events: none;
}

.hex-fill {
  fill: currentColor;
  stroke: #0a0a0f;
  stroke-width: 1.35;
  stroke-linejoin: round;
  paint-order: stroke fill;
}
</style>
