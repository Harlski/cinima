<template>
  <GoldGlowShell
    v-if="outlined"
    :radius="radius"
    :class="{ 'tour-spotlight-fit': fit }"
    :strong="strong"
    :soft="false"
    :halo="halo"
  >
    <slot />
  </GoldGlowShell>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import type { TourSpotlightId } from "@/lib/guidedTour";
import { useGuidedTourStore } from "@/stores/guidedTour";

const props = withDefaults(
  defineProps<{
    /** Spotlight id; the rim shows only while this id is the active tour target. */
    id?: TourSpotlightId | null;
    radius?: string;
    /** Stretch to fill a flex parent (bottom tabs). */
    fit?: boolean;
    /** Thicker rim for small pills. */
    strong?: boolean;
    /** Interior wash. Off except where a step asks for the glow. */
    halo?: boolean;
  }>(),
  {
    id: null,
    radius: "12px",
    fit: false,
    strong: true,
    halo: false,
  }
);

const tour = useGuidedTourStore();

/** Rim only, so the active target reads as the thing to tap. */
const outlined = computed(
  () => props.id != null && tour.isSpotlight(props.id)
);
</script>

<style scoped>
.tour-spotlight-fit {
  flex: 1;
  min-width: 0;
}

.tour-spotlight-fit :deep(.gold-glow-content) {
  display: flex;
  width: 100%;
  height: 100%;
}

.tour-spotlight-fit :deep(.tab) {
  flex: 1;
  width: 100%;
}
</style>
