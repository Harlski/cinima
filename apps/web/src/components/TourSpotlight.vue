<template>
  <GoldGlowShell
    v-if="active"
    :radius="radius"
    :soft="false"
    class="tour-spotlight"
    :class="{ 'tour-spotlight--fit': fit }"
  >
    <slot />
  </GoldGlowShell>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import { useGuidedTourStore } from "@/stores/guidedTour";
import type { TourSpotlightId } from "@/lib/guidedTour";

const props = withDefaults(
  defineProps<{
    /** Spotlight id; when null/undefined, never glows. */
    id?: TourSpotlightId | null;
    radius?: string;
    /** Stretch to fill a flex parent (bottom tabs). */
    fit?: boolean;
  }>(),
  {
    id: null,
    radius: "12px",
    fit: false,
  }
);

const tour = useGuidedTourStore();
const active = computed(() =>
  props.id ? tour.isSpotlight(props.id) : false
);
</script>

<style scoped>
.tour-spotlight--fit {
  flex: 1;
  display: flex;
  min-width: 0;
  align-self: stretch;
}

.tour-spotlight--fit :deep(.gold-glow-content) {
  flex: 1;
  display: flex;
  min-width: 0;
}
</style>
